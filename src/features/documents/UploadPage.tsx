import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingOverlay } from '@/components/LoadingScreen';
import { Input, Select, RadioGroup } from '@/components/Input';
import { MentionTextarea } from '@/components/MentionTextarea';
import { extractDocumentAuto, findDuplicate } from '@/lib/ocr';
import { canUseCloudAi } from '@/lib/planLimits';
import { isDocumentProcessingEnabled } from '@/lib/documentProcessing';
import { isCloudOcrAllowed } from '@/lib/ocrCloud';
import { readFileDataUrl } from '@/lib/files';
import { autoPrepareImageFile } from '@/lib/imagePipeline';
import { compressImageFile } from '@/lib/imageCompress';
import { inferDocTags, CATEGORY_LABELS, DOC_CATEGORIES, DOC_DOMAINS, DOMAIN_LABELS, suggestedCategoryForDocType, suggestedDomainForDocType, resolveDocTags } from '@/lib/docTags';
import { memberSelectLabel } from '@/lib/family';
import { emptyFieldsFor, fieldSchemaFor, normalizeDocFields, documentExpiryFromFields, computeWarrantyEndDate, usesFieldBasedExpiry, primaryFieldKeys } from '@/lib/docFields';
import { formatDate } from '@/lib/format';
import { uploadBackPath } from '@/lib/navigation';
import { remainingUploads } from '@/lib/referrals';
import {
  remainingAssetSlots,
} from '@/lib/planLimits';
import {
  canStageDocument,
  countVerifiedDocuments,
  remainingVerificationSlots,
} from '@/lib/verificationQueue';
import { getDocumentsNeedingReview, isDocumentUnderReview, isDocumentPendingDetails } from '@/lib/documentReview';
import { checkCanAddDocument } from '@/lib/documentLimits';
import {
  MAX_DOCUMENT_TITLE_CHARS,
  sanitizeDocumentNotes,
  sanitizeDocumentTitle,
  validateDocumentFilePayload,
  validatePageCount,
  validateUploadFile,
} from '@/lib/inputLimits';
import { canManageDocument, canViewDocument } from '@/lib/documentVisibility';
import type { UploadNavigationState } from '@/lib/uploadNavigation';
import {
  initialDocTypeFromUploadParams,
  initialMemberIdFromUploadParams,
} from '@/lib/uploadNavigation';
import {
  resolveDocTypeAfterOcr,
  storageDocType,
  type SelectedDocType,
} from '@/lib/ocrRecognition';
import { ImageEditor } from '@/components/ImageEditor';
import { DocumentFilePreview } from '@/components/DocumentFilePreview';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useDocumentFileUrl } from '@/hooks/useDocumentFileUrl';
import { useVaultStore } from '@/store/useVaultStore';
import type { DocCategory, DocDomain, DocType } from '@/types';

type UploadStep = 'pick' | 'edit' | 'verify';
type EditTarget = 'new' | 'replace';

const ALL_DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'pan', label: 'PAN' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'driving_license', label: 'Driving license' },
  { value: 'voter_id', label: 'Voter ID / Election card' },
  { value: 'ration_card', label: 'Ration card' },
  { value: 'vehicle_rc', label: 'Vehicle RC' },
  { value: 'vehicle_puc', label: 'PUC' },
  { value: 'vehicle_insurance', label: 'Vehicle insurance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'health_insurance', label: 'Health insurance' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'medical_bill', label: 'Medical bill' },
  { value: 'discharge_summary', label: 'Discharge summary' },
  { value: 'purchase_receipt', label: 'Purchase / Invoice' },
  { value: 'warranty', label: 'Warranty card' },
  { value: 'other', label: 'Other' },
];

const DOC_TYPE_SELECT_OPTIONS: { value: SelectedDocType; label: string }[] = [
  { value: '', label: 'Choose document type…' },
  ...ALL_DOC_TYPES,
];

const ASSET_DOC_TYPES: DocType[] = [
  'vehicle_rc',
  'vehicle_puc',
  'vehicle_insurance',
  'purchase_receipt',
  'warranty',
];

export function UploadPage() {
  const [params] = useSearchParams();
  const assets = useVaultStore((s) => s.assets);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const settings = useVaultStore((s) => s.settings);
  const user = useVaultStore((s) => s.user);
  const addDocument = useVaultStore((s) => s.addDocument);
  const updateDocument = useVaultStore((s) => s.updateDocument);

  const editId = params.get('edit') ?? '';
  const isEdit = Boolean(editId);
  const editingDoc = isEdit ? documents.find((d) => d.id === editId) : undefined;

  const [files, setFiles] = useState<File[]>([]);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [editQueue, setEditQueue] = useState<File[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>('new');
  const [step, setStep] = useState<UploadStep>(isEdit ? 'verify' : 'pick');
  const isHealth = params.get('context') === 'health';
  const initialDocType = initialDocTypeFromUploadParams(params);
  const [docType, setDocType] = useState<SelectedDocType>(() => initialDocType);
  const [userPickedDocType, setUserPickedDocType] = useState(() => initialDocType !== '');
  const [memberId, setMemberId] = useState(() => initialMemberIdFromUploadParams(params, members));
  const [assetId] = useState(params.get('asset') ?? '');
  const [fields, setFields] = useState<Record<string, string>>(() =>
    emptyFieldsFor(storageDocType(initialDocType)),
  );
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [underWarranty, setUnderWarranty] = useState<'yes' | 'no' | ''>('');
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [warrantyUnit, setWarrantyUnit] = useState<'months' | 'years'>('years');
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [limitError, setLimitError] = useState('');
  const [replacedFile, setReplacedFile] = useState(false);
  const [needsValidation, setNeedsValidation] = useState(false);
  const [needsDocTypeSelection, setNeedsDocTypeSelection] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [domain, setDomain] = useState<DocDomain>('family');
  const [category, setCategory] = useState<DocCategory>('identity');
  const [editAssetId, setEditAssetId] = useState('');
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = isEdit ? `/documents/${editId}` : uploadBackPath(params);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const consumedNavFileRef = useRef(false);
  const verifiedCount = countVerifiedDocuments(documents);
  const uploadsLeft = user ? remainingUploads(user, verifiedCount) : null;
  const assetSlotsLeft = user ? remainingAssetSlots(user, assets.length) : null;
  const verifySlotsLeft = user ? remainingVerificationSlots(user, documents) : null;
  const canStage = canStageDocument(user, documents);
  const processingEnabled = isDocumentProcessingEnabled(settings);
  const {
    fileDataUrl: storedFileDataUrl,
    additionalFileDataUrls: storedAdditionalFileDataUrls,
    loading: storedFileLoading,
    error: storedFileError,
  } = useDocumentFileUrl(isEdit ? editingDoc : undefined);

  const isPurchase =
    params.get('type') === 'purchase' || storageDocType(docType) === 'purchase_receipt';
  const isCamera = params.get('source') === 'camera';

  const applyDocTypeChange = (next: SelectedDocType) => {
    const picked = next !== '';
    setDocType(next);
    setUserPickedDocType(picked);
    setNeedsDocTypeSelection(false);
    const stored = storageDocType(next);
    setFields(emptyFieldsFor(stored));
    setExpiryDate('');
    setDuplicate(null);
    setCategory(suggestedCategoryForDocType(stored));
    setDomain(
      suggestedDomainForDocType(stored, {
        memberId,
        assetId: editAssetId || assetId || undefined,
        uploadContext: isHealth ? 'health' : undefined,
      }),
    );
    if (stored === 'purchase_receipt') {
      setUnderWarranty('');
      setWarrantyDuration('');
    } else {
      setUnderWarranty('');
    }
  };

  useEffect(() => {
    const verifyId = params.get('verify');
    if (verifyId && !isEdit) {
      navigate(`/documents/${verifyId}`, { replace: true });
    }
  }, [params, isEdit, navigate]);

  useEffect(() => {
    if (!isEdit) return;
    if (!editingDoc) return;
    setStep('verify');
    setTitle(editingDoc.title);
    if (editingDoc.needsDocTypeSelection) {
      setDocType('');
      setUserPickedDocType(false);
      setNeedsDocTypeSelection(true);
    } else {
      setDocType(editingDoc.docType);
      setUserPickedDocType(true);
      setNeedsDocTypeSelection(false);
    }
    setExpiryDate(editingDoc.expiryDate ?? '');
    setNotes(editingDoc.notes ?? '');
    setFields(normalizeDocFields(editingDoc.docType, editingDoc.fields));
    setReplacedFile(false);
    setNeedsValidation(false);
    setOcrLoading(false);
    const tags = resolveDocTags(editingDoc);
    setDomain(tags.domain);
    setCategory(tags.category);
    setEditAssetId(editingDoc.assetId ?? '');
    if (editingDoc.memberId) setMemberId(editingDoc.memberId);
    if (editingDoc.docType === 'purchase_receipt') {
      setUnderWarranty(editingDoc.fields.warrantyUntil ? 'yes' : 'no');
    } else {
      setUnderWarranty('');
    }
  }, [isEdit, editingDoc?.id]);

  useEffect(() => {
    if (!file) {
      setReplacePreviewUrl(undefined);
      return;
    }
    let cancelled = false;
    void readFileDataUrl(file).then((url) => {
      if (!cancelled) setReplacePreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!isPurchase || underWarranty !== 'yes' || !warrantyDuration) return;
    const until = computeWarrantyEndDate(
      fields.purchaseDate,
      Number(warrantyDuration),
      warrantyUnit,
    );
    if (!until) return;
    setFields((prev) => ({ ...prev, warrantyUntil: until }));
    setExpiryDate(until);
  }, [isPurchase, underWarranty, warrantyDuration, warrantyUnit, fields.purchaseDate]);

  useEffect(() => {
    if (!isPurchase || underWarranty !== 'no') return;
    setFields((prev) => ({ ...prev, warrantyUntil: '' }));
    setExpiryDate('');
    setWarrantyDuration('');
  }, [isPurchase, underWarranty]);

  const applyPickedFiles = async (picked: File[], options?: { skipEdit?: boolean }) => {
    if (picked.length === 0) return;

    for (const file of picked) {
      const check = validateUploadFile(file);
      if (!check.ok) {
        setLimitError(check.message);
        return;
      }
    }

    const pageCheck = validatePageCount(files.length, picked.length);
    if (!pageCheck.ok) {
      setLimitError(pageCheck.message);
      return;
    }

    setLimitError('');
    const images = picked.filter((f) => f.type.startsWith('image/'));
    const pdfs = picked.filter((f) => !f.type.startsWith('image/'));

    if (!options?.skipEdit && images.length > 0) {
      const [first, ...rest] = images;
      setEditQueue(rest);
      setDraftFile(first);
      setEditTarget('new');
      setStep('edit');
      if (files.length === 0) {
        setTitle(first.name.replace(/\.[^.]+$/, ''));
      }
      if (pdfs.length > 0) {
        setFiles((prev) => [...prev, ...pdfs]);
      }
      return;
    }

    if (pdfs.length > 0) {
      setFiles((prev) => [...prev, ...pdfs]);
      if (files.length === 0 && pdfs[0]) {
        setTitle(pdfs[0].name.replace(/\.[^.]+$/, ''));
      }
      setStep('pick');
      return;
    }

    setProcessing(true);
    try {
      const prepared = await Promise.all(
        images.map((f) => autoPrepareImageFile(f)),
      );
      setFiles((prev) => [...prev, ...prepared]);
      if (files.length === 0 && prepared[0]) {
        setTitle(prepared[0].name.replace(/\.[^.]+$/, ''));
      }
      setStep('pick');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (isEdit || consumedNavFileRef.current) return;
    const navState = location.state as UploadNavigationState | null;
    const picked = navState?.pickedFile;
    if (!picked) return;

    consumedNavFileRef.current = true;
    void applyPickedFiles([picked]);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [isEdit, location.pathname, location.search, location.state, navigate]);

  const handlePickInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (list.length > 0) void applyPickedFiles(list);
  };

  const openAddPage = () => {
    (isCamera ? cameraInputRef : fileInputRef).current?.click();
  };

  const handleEditDone = async (edited: File, addAnother = false) => {
    setProcessing(true);
    try {
      const fileCheck = validateUploadFile(edited);
      if (!fileCheck.ok) {
        setLimitError(fileCheck.message);
        return;
      }
      const pageCheck = validatePageCount(files.length, 1);
      if (!pageCheck.ok) {
        setLimitError(pageCheck.message);
        return;
      }
      let compressed: File;
      try {
        compressed = await compressImageFile(edited);
      } catch {
        setLimitError('Could not process this image. Try a smaller photo.');
        return;
      }
      if (editTarget === 'replace') {
        setFile(compressed);
        setReplacedFile(true);
        setDraftFile(null);
        await runReplaceOcr(compressed);
        setStep('verify');
        setEditTarget('new');
        return;
      }

      setFiles((prev) => [...prev, compressed]);

      setEditQueue((queue) => {
        if (queue.length > 0) {
          setDraftFile(queue[0]!);
          return queue.slice(1);
        }
        setDraftFile(null);
        setStep('pick');
        if (addAnother) {
          window.setTimeout(() => openAddPage(), 0);
        }
        return [];
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    if (editTarget === 'replace') {
      setDraftFile(null);
      setStep('verify');
      return;
    }
    setDraftFile(null);
    setEditQueue([]);
    setStep('pick');
    window.setTimeout(() => openAddPage(), 0);
  };

  const submitNewUpload = async () => {
    if (files.length === 0) return;
    setLimitError('');
    setProcessing(true);
    try {
      const gate = checkCanAddDocument(user, documents, assets, members, {
        memberId: isPurchase ? undefined : memberId || undefined,
        assetId: assetId || undefined,
        reviewStatus: 'processing',
      });
      if (!gate.allowed) {
        if (gate.reason === 'member_cap') {
          setLimitError('This family member has reached the maximum document storage. Contact support if you need more space.');
        } else if (gate.reason === 'pending_queue') {
          setLimitError('Review your pending documents before uploading more.');
        } else {
          setLimitError('Upload not allowed on your current plan.');
        }
        return;
      }

      const dataUrls = await Promise.all(files.map((f) => readFileDataUrl(f)));
      const [fileDataUrl, ...rest] = dataUrls;
      const additionalFileDataUrls = rest.length > 0 ? rest : undefined;
      const payloadCheck = validateDocumentFilePayload(fileDataUrl, additionalFileDataUrls);
      if (!payloadCheck.ok) {
        setLimitError(payloadCheck.message);
        return;
      }

      const stored = storageDocType(docType);
      const tags = inferDocTags(stored, {
        memberId: isPurchase ? undefined : memberId || undefined,
        assetId: assetId || undefined,
        uploadContext: isHealth ? 'health' : undefined,
      });
      const docTitle = sanitizeDocumentTitle(title || files[0]!.name.replace(/\.[^.]+$/, '') || 'Document');
      const combinedFileName =
        files.length === 1 ? files[0]!.name : `${files[0]!.name} +${files.length - 1} more`;

      const id = addDocument({
        title: docTitle,
        docType: stored,
        domain: tags.domain,
        category: tags.category,
        memberId: isPurchase ? undefined : memberId || undefined,
        assetId: assetId || undefined,
        fields: emptyFieldsFor(stored),
        notes: sanitizeDocumentNotes(notes),
        fileName: combinedFileName,
        fileDataUrl,
        additionalFileDataUrls,
        reviewStatus: processingEnabled ? 'processing' : 'pending_details',
      });

      if (!id) {
        setLimitError('Could not save document. Check your plan limits or review queue.');
        return;
      }

      if (processingEnabled) {
        navigate(backTo);
        void useVaultStore.getState().processNewUpload(id, {
          fileName: combinedFileName,
          docType: stored,
          userPickedDocType,
          fileDataUrl,
          additionalFileDataUrls,
        });
      } else {
        navigate(`/upload?edit=${id}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const runExtract = async () => {
    if (files.length === 0) return;
    await submitNewUpload();
  };

  const runReplaceOcr = async (picked: File) => {
    setOcrLoading(true);
    setLimitError('');
    try {
      if (!processingEnabled) {
        const requested = storageDocType(docType);
        setFields(
          Object.fromEntries(
            Object.entries(emptyFieldsFor(requested)).map(([k, v]) => [k, String(v ?? '')]),
          ),
        );
        setNeedsValidation(true);
        return;
      }

      const fileDataUrl = picked.type.startsWith('image/') ? await readFileDataUrl(picked) : undefined;
      const cloudAllowed =
        isCloudOcrAllowed(settings, canUseCloudAi(user)) &&
        (settings.cloudAiEnabled || import.meta.env.DEV);
      const requested = storageDocType(docType);
      const result = await extractDocumentAuto({
        fileName: picked.name,
        docType: requested,
        fileDataUrl,
        cloudAllowed,
      });
      const resolved = resolveDocTypeAfterOcr(requested, userPickedDocType, result);
      setNeedsDocTypeSelection(resolved.needsDocTypeSelection);
      if (resolved.needsDocTypeSelection) {
        setDocType('');
        setUserPickedDocType(false);
        setFields({});
      } else {
        setDocType(resolved.docType);
        setUserPickedDocType(true);
        const mapped = normalizeDocFields(resolved.docType, resolved.fields);
        setFields(
          Object.fromEntries(
            Object.entries(mapped).map(([k, v]) => [k, String(v ?? '')]),
          ),
        );
      }
      if (result.expiryDate && !resolved.needsDocTypeSelection) setExpiryDate(result.expiryDate);
      const mapped = resolved.needsDocTypeSelection
        ? {}
        : normalizeDocFields(resolved.docType, resolved.fields);
      const docTitle = mapped.productName
        ? String(mapped.productName)
        : picked.name.replace(/\.[^.]+$/, '');
      if (docTitle) setTitle(docTitle);
      const dup = findDuplicate(
        documents.filter((d) => d.id !== editId),
        resolved.docType,
        resolved.fields,
      );
      setDuplicate(dup?.title ?? null);
      setNeedsValidation(true);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleReplacePick = async (picked: File | null) => {
    if (!picked) {
      setFile(null);
      setReplacedFile(false);
      setNeedsValidation(false);
      return;
    }
    if (picked.type.startsWith('image/')) {
      setDraftFile(picked);
      setEditTarget('replace');
      setStep('edit');
      return;
    }
    setProcessing(true);
    try {
      setFile(picked);
      setReplacedFile(true);
      await runReplaceOcr(picked);
    } finally {
      setProcessing(false);
    }
  };

  const save = async () => {
    setLimitError('');
    if (isEdit) {
      if (!editingDoc) {
        setLimitError('Document not found.');
        return;
      }
      if (needsDocTypeSelection || docType === '') {
        setLimitError('Choose a document type before saving.');
        return;
      }

      const stored = storageDocType(docType);
      const normalizedFields = normalizeDocFields(stored, fields);
      const docExpiry = documentExpiryFromFields(stored, normalizedFields, expiryDate || undefined);

      if (stored === 'purchase_receipt' && !underWarranty) {
        setLimitError('Please confirm if this item is under warranty.');
        return;
      }
      if (stored === 'purchase_receipt' && underWarranty === 'yes' && !normalizedFields.warrantyUntil) {
        setLimitError('Enter warranty duration to calculate validity date.');
        return;
      }
      if (replacedFile && !file) {
        setLimitError('Choose a new file to replace.');
        return;
      }

      let fileDataUrl: string | undefined;
      if (file) {
        fileDataUrl = await readFileDataUrl(file);
        const payloadCheck = validateDocumentFilePayload(fileDataUrl);
        if (!payloadCheck.ok) {
          setLimitError(payloadCheck.message);
          return;
        }
      }

      updateDocument(editingDoc.id, {
        title: sanitizeDocumentTitle(title || 'Document'),
        docType: stored,
        domain,
        category,
        memberId: stored === 'purchase_receipt' ? undefined : memberId || undefined,
        assetId: editAssetId || undefined,
        expiryDate: docExpiry,
        fields: normalizedFields,
        notes: sanitizeDocumentNotes(notes),
        needsDocTypeSelection: false,
        reviewStatus: 'reviewed',
        verificationStatus: 'verified',
        ...(file
          ? {
              fileName: file.name,
              fileDataUrl,
            }
          : {}),
      });

      if (needsValidation || isDocumentUnderReview(editingDoc) || isDocumentPendingDetails(editingDoc)) {
        useVaultStore.getState().logActivity('reviewed', {}, editingDoc.id);
      }

      navigate(`/documents/${editingDoc.id}`);
      return;
    }
  };

  const showAssetLink =
    domain === 'assets' || Boolean(editAssetId) || ASSET_DOC_TYPES.includes(storageDocType(docType));

  const pageTitle = isEdit
    ? editingDoc && isDocumentPendingDetails(editingDoc)
      ? 'Add document details'
      : 'Edit document'
    : isCamera
      ? 'Scan document'
      : isHealth
        ? 'Add health record'
        : 'Add document';

  const storedEditType = storageDocType(docType);
  const editFieldDefs = fieldSchemaFor(storedEditType).filter(
    (field) => !(isPurchase && field.key === 'warrantyUntil'),
  );
  const editPrimaryKeySet = new Set(primaryFieldKeys(storedEditType));

  const updateEditField = (key: string, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (usesFieldBasedExpiry(storedEditType)) {
      const mapped = documentExpiryFromFields(storedEditType, next);
      if (mapped) setExpiryDate(mapped);
    }
  };

  const renderEditField = (field: (typeof editFieldDefs)[number]) => (
    <Input
      key={field.key}
      label={field.label}
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      value={fields[field.key] ?? ''}
      onChange={(e) => updateEditField(field.key, e.target.value)}
    />
  );

  const saveLabel =
    editingDoc && isDocumentPendingDetails(editingDoc)
      ? 'Save document'
      : needsValidation
        ? 'Validate and save'
        : 'Save changes';

  if (isEdit && !editingDoc) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Edit document" backFallback="/" />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">Document not found.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (
    isEdit &&
    editingDoc &&
    (!canViewDocument(editingDoc, members, user, shareGrants, documents) ||
      !canManageDocument(editingDoc, members, user, documents))
  ) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Edit document" backFallback={`/documents/${editId}`} />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">You don&apos;t have permission to edit this document.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className={`min-h-full ${
        step === 'verify' && isEdit
          ? 'pb-[calc(5.5rem+max(1rem,env(safe-area-inset-bottom,0px)))]'
          : 'pb-28'
      }`}
    >
      <Header title={pageTitle} backFallback={backTo} />
      <main className="page-main animate-fade-up space-y-4">
        {user?.plan === 'free' && uploadsLeft !== null && (
          <p className="text-xs text-muted">
            {uploadsLeft} upload{uploadsLeft === 1 ? '' : 's'} left on your plan.{' '}
            <Link to="/profile/referrals" className="text-accent-ink">
              Invite friends
            </Link>
          </p>
        )}
        {isPurchase && assetSlotsLeft !== null && (
          <p className="text-xs text-muted">
            {assetSlotsLeft} asset slot{assetSlotsLeft === 1 ? '' : 's'} left on free plan.
          </p>
        )}
        {verifySlotsLeft !== null && verifySlotsLeft <= 2 && verifySlotsLeft > 0 && (
          <p className="text-xs text-muted">
            {verifySlotsLeft} upload slot{verifySlotsLeft === 1 ? '' : 's'} left before verification is required.
          </p>
        )}
        {!canStage && (
          <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
            Review pending documents before uploading more.{' '}
            <Link to={`/documents/${getDocumentsNeedingReview(documents)[0]?.id ?? ''}`} className="text-accent-ink">
              Review now
            </Link>
          </p>
        )}
        {limitError && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{limitError}</p>
        )}
        {step === 'edit' && draftFile && (
          <ImageEditor
            file={draftFile}
            pageLabel={
              editTarget === 'new' && (files.length > 0 || editQueue.length > 0)
                ? `Page ${files.length + 1}${
                    editQueue.length > 0 ? ` · ${editQueue.length} more to edit` : ''
                  }`
                : undefined
            }
            onDone={(f) => void handleEditDone(f, false)}
            onAddAnother={
              editTarget === 'new' && !isEdit ? (f) => void handleEditDone(f, true) : undefined
            }
            onRetake={handleRetake}
          />
        )}
        {step === 'pick' && !params.get('verify') && (
          <>
            {files.length === 0 ? (
              <>
                {isCamera ? (
                  <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/35 bg-accent-soft/50 p-6 text-center text-sm shadow-sm">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePickInput}
                    />
                    <span className="text-4xl">📷</span>
                    <p className="mt-3 font-medium text-text">Tap to open camera</p>
                    <p className="mt-1 text-xs text-muted">Take a photo of your document</p>
                  </label>
                ) : (
                  <label className="surface-panel flex min-h-36 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border p-6 text-sm text-muted">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={handlePickInput}
                    />
                    Tap to choose photo(s) or PDF — select multiple for front & back
                  </label>
                )}

                {!isCamera && (
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => {
                      setFiles([]);
                      const next = new URLSearchParams(params);
                      next.set('source', 'camera');
                      navigate(`/upload?${next.toString()}`);
                    }}
                  >
                    📷 Scan with camera instead
                  </Button>
                )}
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handlePickInput}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePickInput}
                />
                <button
                  type="button"
                  onClick={openAddPage}
                  className="surface-panel flex min-h-20 w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border p-4 text-center text-sm"
                >
                  <p className="font-medium text-text">
                    {files.length === 1 ? '1 page ready' : `${files.length} pages ready`}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {isCamera ? 'Tap to take another photo' : 'Tap to add another page'}
                  </p>
                </button>

                <ul className="space-y-1 rounded-xl border border-border-soft bg-surface-elevated p-3 text-xs">
                  {files.map((f, idx) => (
                    <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted">
                        Page {idx + 1}: {f.name}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-danger"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>

                <Button variant="secondary" className="w-full" onClick={openAddPage}>
                  {isCamera ? '📷 Take another page' : 'Add another page'}
                </Button>

                {!isCamera && (
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => {
                      setFiles([]);
                      const next = new URLSearchParams(params);
                      next.set('source', 'camera');
                      navigate(`/upload?${next.toString()}`);
                    }}
                  >
                    📷 Scan with camera instead
                  </Button>
                )}

            <p className="text-xs text-muted">
              {processingEnabled
                ? 'Each photo is cropped and enhanced before save. Add front & back pages, then upload together — text extraction runs automatically on all pages.'
                : 'Each photo is cropped and enhanced before save. Add front & back pages, then upload — you will enter document details on the next screen.'}
            </p>

            <Select
              label="Document type"
              value={docType}
              onChange={(e) => applyDocTypeChange(e.target.value as SelectedDocType)}
            >
              {DOC_TYPE_SELECT_OPTIONS.map((t) => (
                <option key={t.value || 'blank'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>

            {docType === '' && files.some((f) => f.type.startsWith('image/')) && processingEnabled && (
              <p className="rounded-xl bg-accent-soft/80 px-3 py-2 text-xs text-muted">
                Choose a document type for better field extraction — we read name, ID number, and
                dates from the right areas of the card.
              </p>
            )}

            {!processingEnabled && (
              <p className="rounded-xl bg-accent-soft/80 px-3 py-2 text-xs text-muted">
                Document processing is off in Settings — choose a type, upload, then fill in the
                fields yourself.
              </p>
            )}

            {needsDocTypeSelection && (
              <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                We could not recognize this document. Choose a document type before uploading.
              </p>
            )}

            <Button
              className="w-full"
              disabled={
                files.length === 0 ||
                !canStage ||
                needsDocTypeSelection ||
                (files.some((f) => f.type.startsWith('image/')) && docType === '')
              }
              onClick={() => void runExtract()}
            >
              {processingEnabled
                ? files.length > 1
                  ? `Upload ${files.length} pages`
                  : 'Continue'
                : files.length > 1
                  ? `Upload ${files.length} pages & enter details`
                  : 'Upload & enter details'}
            </Button>
              </>
            )}
          </>
        )}

        {step === 'verify' && isEdit && editingDoc && (
          <>
            <DocumentFilePreview
              fileName={file?.name ?? editingDoc.fileName}
              fileDataUrl={replacePreviewUrl ?? (file ? undefined : storedFileDataUrl)}
              additionalFileDataUrls={file ? undefined : storedAdditionalFileDataUrls}
              loading={file ? !replacePreviewUrl : storedFileLoading}
              error={storedFileError}
            />

            {(needsValidation || isDocumentPendingDetails(editingDoc)) && !ocrLoading && (
              <p className="rounded-xl bg-accent-soft/80 px-3 py-2 text-xs text-muted">
                {processingEnabled && !isDocumentPendingDetails(editingDoc)
                  ? 'Check extracted fields against the preview, then save.'
                  : 'Fill in the fields below to add this document to your vault.'}
              </p>
            )}

            {duplicate && (
              <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                Similar document exists: {duplicate}. Saving anyway.
              </p>
            )}

            {needsDocTypeSelection && (
              <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
                Choose a document type below, then save.
              </p>
            )}

            <section className="surface-panel space-y-3 p-4">
              <p className="section-label">Essentials</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, MAX_DOCUMENT_TITLE_CHARS))}
                  maxLength={MAX_DOCUMENT_TITLE_CHARS}
                />
                <Select
                  label="Document type"
                  value={docType}
                  onChange={(e) => applyDocTypeChange(e.target.value as SelectedDocType)}
                >
                  {DOC_TYPE_SELECT_OPTIONS.map((t) => (
                    <option key={t.value || 'blank'} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                {storedEditType !== 'purchase_receipt' && members.length > 0 && (
                  <Select label="Family member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{memberSelectLabel(m)}</option>
                    ))}
                  </Select>
                )}
              </div>
            </section>

            {editFieldDefs.length > 0 && (
              <section className="space-y-3">
                <p className="section-label">
                  {isDocumentPendingDetails(editingDoc) ? 'Document fields' : 'Extracted fields'}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                  {editFieldDefs.filter((field) => editPrimaryKeySet.has(field.key)).map(renderEditField)}
                </div>
                {editFieldDefs.some((field) => !editPrimaryKeySet.has(field.key)) && (
                  <CollapsibleSection title="More fields" defaultOpen={false}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                      {editFieldDefs.filter((field) => !editPrimaryKeySet.has(field.key)).map(renderEditField)}
                    </div>
                  </CollapsibleSection>
                )}
              </section>
            )}

            <CollapsibleSection title="Organize" subtitle="Tags, asset link, expiry" defaultOpen={false}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                <Select label="Tab tag" value={domain} onChange={(e) => setDomain(e.target.value as DocDomain)}>
                  {DOC_DOMAINS.map((d) => (
                    <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
                  ))}
                </Select>
                <Select label="Category tag" value={category} onChange={(e) => setCategory(e.target.value as DocCategory)}>
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </Select>
                {showAssetLink && (
                  <Select label="Linked asset" value={editAssetId} onChange={(e) => setEditAssetId(e.target.value)}>
                    <option value="">None</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </Select>
                )}
                {!usesFieldBasedExpiry(storedEditType) && (
                  <Input
                    label="Expiry date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                )}
              </div>
            </CollapsibleSection>

            {isPurchase && (
              <CollapsibleSection title="Warranty" defaultOpen={underWarranty === 'yes'}>
                <div className="space-y-3">
                  <RadioGroup
                    label="Under warranty?"
                    name="underWarrantyEdit"
                    value={underWarranty}
                    onChange={(v) => setUnderWarranty(v as 'yes' | 'no')}
                    options={[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ]}
                  />
                  {underWarranty === 'yes' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                      <Input
                        label="Warranty duration"
                        type="number"
                        min={1}
                        value={warrantyDuration}
                        onChange={(e) => setWarrantyDuration(e.target.value)}
                      />
                      <Select
                        label="Unit"
                        value={warrantyUnit}
                        onChange={(e) => setWarrantyUnit(e.target.value as 'months' | 'years')}
                      >
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </Select>
                    </div>
                  )}
                  {underWarranty === 'yes' && fields.warrantyUntil && (
                    <p className="text-sm text-muted">
                      Warranty valid until:{' '}
                      <span className="font-medium text-text">{formatDate(fields.warrantyUntil)}</span>
                    </p>
                  )}
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Replace file" subtitle={editingDoc.fileName ?? 'Upload a new photo or PDF'} defaultOpen={false}>
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent/35 bg-accent-soft/30 p-4 text-center">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => void handleReplacePick(e.target.files?.[0] ?? null)}
                />
                <p className="text-sm font-semibold text-text">
                  {file ? `Selected: ${file.name}` : 'Choose new file'}
                </p>
                <p className="mt-1 text-xs text-muted">Images open in the editor before save</p>
              </label>
            </CollapsibleSection>

            <CollapsibleSection title="Notes" subtitle="Optional — type @ to mention family" defaultOpen={Boolean(notes.trim())}>
              <MentionTextarea
                label="Notes"
                placeholder="Extra details — type @ to mention family"
                value={notes}
                onChange={setNotes}
                members={members}
              />
            </CollapsibleSection>
          </>
        )}

      </main>
      {step === 'verify' && isEdit && editingDoc && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button variant="ghost" className="shrink-0 px-4" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button
              className="min-w-0 flex-1"
              disabled={ocrLoading || needsDocTypeSelection || docType === ''}
              onClick={() => void save()}
            >
              {saveLabel}
            </Button>
          </div>
        </div>
      )}
      {!(step === 'verify' && isEdit) && <BottomNav />}
      <LoadingOverlay
        open={ocrLoading || processing}
        label={
          ocrLoading
            ? 'Scanning document…'
            : processing
              ? 'Preparing and compressing…'
              : 'Processing…'
        }
      />
    </div>
  );
}
