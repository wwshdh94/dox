import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingOverlay } from '@/components/LoadingScreen';
import { Input, RadioGroup, Select, Textarea } from '@/components/Input';
import { extractOnDevice, findDuplicate } from '@/lib/ocr';
import { readFileDataUrl } from '@/lib/files';
import { inferDocTags, CATEGORY_LABELS, DOMAIN_LABELS, categoryForDocType, categoriesForDocType, coerceCategoryForDocType, coerceDomainForDocType, domainsForDocType, defaultDomainForDocType, resolveDocTags } from '@/lib/docTags';
import { memberSelectLabel } from '@/lib/family';
import { emptyFieldsFor, fieldSchemaFor, normalizeDocFields, documentExpiryFromFields, computeWarrantyEndDate, usesFieldBasedExpiry } from '@/lib/docFields';
import { formatDate } from '@/lib/format';
import { uploadBackPath } from '@/lib/navigation';
import { canUploadDocument, remainingUploads } from '@/lib/referrals';
import {
  canAddAsset,
  remainingAssetSlots,
} from '@/lib/planLimits';
import {
  canStageDocument,
  countVerifiedDocuments,
  remainingVerificationSlots,
} from '@/lib/verificationQueue';
import { checkCanAddDocument } from '@/lib/documentLimits';
import { useVaultStore } from '@/store/useVaultStore';
import type { DocCategory, DocDomain, DocType } from '@/types';

type ExtractMode = 'manual' | 'on_device' | 'cloud';

const ALL_DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'pan', label: 'PAN' },
  { value: 'aadhaar', label: 'Aadhaar' },
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
  const settings = useVaultStore((s) => s.settings);
  const user = useVaultStore((s) => s.user);
  const addDocument = useVaultStore((s) => s.addDocument);
  const updateDocument = useVaultStore((s) => s.updateDocument);
  const verifyDocument = useVaultStore((s) => s.verifyDocument);
  const deleteDocument = useVaultStore((s) => s.deleteDocument);
  const addAsset = useVaultStore((s) => s.addAsset);

  const editId = params.get('edit') ?? '';
  const isEdit = Boolean(editId);
  const editingDoc = isEdit ? documents.find((d) => d.id === editId) : undefined;

  const [file, setFile] = useState<File | null>(null);
  const [extractMode, setExtractMode] = useState<ExtractMode>('on_device');
  const [step, setStep] = useState<'pick' | 'verify'>(params.get('verify') || isEdit ? 'verify' : 'pick');
  const isHealth = params.get('context') === 'health';
  const [docType, setDocType] = useState<DocType>(
    params.get('type') === 'purchase'
      ? 'purchase_receipt'
      : isHealth
        ? 'health_insurance'
        : 'passport',
  );
  const [memberId, setMemberId] = useState(params.get('member') ?? members[0]?.id ?? '');
  const [assetId] = useState(params.get('asset') ?? '');
  const [fields, setFields] = useState<Record<string, string>>(() => emptyFieldsFor(docType));
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [underWarranty, setUnderWarranty] = useState<'yes' | 'no' | ''>('');
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [warrantyUnit, setWarrantyUnit] = useState<'months' | 'years'>('years');
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [limitError, setLimitError] = useState('');
  const [stagedDocId, setStagedDocId] = useState<string | null>(params.get('verify'));
  const [replacedFile, setReplacedFile] = useState(false);
  const [needsValidation, setNeedsValidation] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [domain, setDomain] = useState<DocDomain>('family');
  const [category, setCategory] = useState<DocCategory>('identity');
  const [editAssetId, setEditAssetId] = useState('');
  const navigate = useNavigate();
  const backTo = isEdit ? `/documents/${editId}` : uploadBackPath(params);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedPickerRef = useRef(false);
  const verifiedCount = countVerifiedDocuments(documents);
  const uploadsLeft = user ? remainingUploads(user, verifiedCount) : null;
  const assetSlotsLeft = user ? remainingAssetSlots(user, assets.length) : null;
  const verifySlotsLeft = user ? remainingVerificationSlots(user, documents) : null;
  const canStage = canStageDocument(user, documents);

  const isPurchase = docType === 'purchase_receipt' || params.get('type') === 'purchase';
  const isCamera = params.get('source') === 'camera';
  const resumeDoc = stagedDocId ? documents.find((d) => d.id === stagedDocId) : undefined;

  useEffect(() => {
    if (!isEdit) return;
    if (!editingDoc) return;
    setStep('verify');
    setTitle(editingDoc.title);
    setDocType(editingDoc.docType);
    setExpiryDate(editingDoc.expiryDate ?? '');
    setNotes(editingDoc.notes ?? '');
    setFields(normalizeDocFields(editingDoc.docType, editingDoc.fields));
    setReplacedFile(false);
    setNeedsValidation(false);
    setOcrLoading(false);
    const tags = resolveDocTags(editingDoc);
    setDomain(coerceDomainForDocType(editingDoc.docType, tags.domain));
    setCategory(coerceCategoryForDocType(editingDoc.docType));
    setEditAssetId(editingDoc.assetId ?? '');
    if (editingDoc.memberId) setMemberId(editingDoc.memberId);
    if (editingDoc.docType === 'purchase_receipt') {
      setUnderWarranty(editingDoc.fields.warrantyUntil ? 'yes' : 'no');
    } else {
      setUnderWarranty('');
    }
  }, [isEdit, editingDoc?.id]);

  useEffect(() => {
    if (!resumeDoc) return;
    setStep('verify');
    setTitle(resumeDoc.title);
    setExpiryDate(resumeDoc.expiryDate ?? '');
    setNotes(resumeDoc.notes ?? '');
    setFields(normalizeDocFields(resumeDoc.docType, resumeDoc.fields));
    if (resumeDoc.docType === 'purchase_receipt') {
      if (resumeDoc.fields.warrantyUntil) {
        setUnderWarranty('yes');
      } else {
        setUnderWarranty('no');
      }
    }
    if (resumeDoc.memberId) setMemberId(resumeDoc.memberId);
    if (resumeDoc.docType) setDocType(resumeDoc.docType);
  }, [resumeDoc?.id]);

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

  const applyPickedFile = (picked: File) => {
    setFile(picked);
    setExtractMode('on_device');
    setTitle(picked.name.replace(/\.[^.]+$/, ''));
  };

  const handlePickInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (picked) applyPickedFile(picked);
  };

  const openFilePicker = () => {
    const input = isCamera ? cameraInputRef.current : fileInputRef.current;
    input?.click();
  };

  useEffect(() => {
    autoOpenedPickerRef.current = false;
  }, [isCamera]);

  useEffect(() => {
    if (step !== 'pick' || params.get('verify') || isEdit || file) return;

    const input = isCamera ? cameraInputRef.current : fileInputRef.current;
    if (!input || autoOpenedPickerRef.current) return;

    autoOpenedPickerRef.current = true;
    const timer = window.setTimeout(() => input.click(), 150);
    return () => clearTimeout(timer);
  }, [step, isCamera, isEdit, file, params]);

  const stageForVerification = async (initialFields: Record<string, string>, docTitle: string) => {
    setLimitError('');
    if (isEdit) {
      // Edit mode does not create a new pending document.
      setStep('verify');
      return;
    }
    const gate = checkCanAddDocument(user, documents, assets, members, {
      memberId: isPurchase ? undefined : memberId || undefined,
      assetId: assetId || undefined,
      verificationStatus: 'pending',
    });
    if (!gate.allowed) {
      if (gate.reason === 'member_cap') {
        setLimitError('This family member has reached the maximum document storage. Contact support if you need more space.');
      } else if (gate.reason === 'pending_queue') {
        setLimitError('Verify your pending documents before uploading more.');
      } else {
        setLimitError('Upload not allowed on your current plan.');
      }
      return;
    }

    const fileDataUrl = file ? await readFileDataUrl(file) : undefined;
    const tags = inferDocTags(docType, {
      memberId: isPurchase ? undefined : memberId || undefined,
      assetId: assetId || undefined,
      uploadContext: isHealth ? 'health' : undefined,
    });

    const normalizedInitial = normalizeDocFields(docType, initialFields);
    const stagedExpiry = documentExpiryFromFields(docType, normalizedInitial, expiryDate || undefined);

    const id = addDocument({
      title: docTitle || 'Document',
      docType,
      domain: tags.domain,
      category: tags.category,
      memberId: isPurchase ? undefined : memberId || undefined,
      assetId: assetId || undefined,
      expiryDate: stagedExpiry,
      fields: normalizedInitial,
      notes: notes.trim() || undefined,
      fileName: file?.name,
      fileDataUrl,
      verificationStatus: 'pending',
    });

    if (!id) {
      setLimitError('Could not stage document. Check your plan limits or pending queue.');
      return;
    }

    setStagedDocId(id);
    setStep('verify');
  };

  const runExtract = async () => {
    if (!file) return;
    setProcessing(true);
    setLimitError('');
    try {
      const result = await extractOnDevice(file.name, docType);
      const mapped = normalizeDocFields(docType, result.fields);
      setFields(mapped);
      if (result.expiryDate) setExpiryDate(result.expiryDate);
      const docTitle = mapped.productName
        ? mapped.productName
        : file.name.replace(/\.[^.]+$/, '');
      setTitle(docTitle);

      const dup = findDuplicate(documents, docType, result.fields);
      if (dup) setDuplicate(dup.title);

      if (result.confidence < 0.6 && extractMode !== 'cloud') {
        // low confidence — user can switch to cloud on Pro
      }
      await stageForVerification(mapped, docTitle);
    } finally {
      setProcessing(false);
    }
  };

  const continueManual = async () => {
    setProcessing(true);
    try {
      const docTitle = title || file?.name.replace(/\.[^.]+$/, '') || 'Document';
      setTitle(docTitle);
      await stageForVerification(fields, docTitle);
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

      const normalizedFields = normalizeDocFields(docType, fields);
      const docExpiry = documentExpiryFromFields(docType, normalizedFields, expiryDate || undefined);

      if (docType === 'purchase_receipt' && !underWarranty) {
        setLimitError('Please confirm if this item is under warranty.');
        return;
      }
      if (docType === 'purchase_receipt' && underWarranty === 'yes' && !normalizedFields.warrantyUntil) {
        setLimitError('Enter warranty duration to calculate validity date.');
        return;
      }
      if (replacedFile && !file) {
        setLimitError('Choose a new file to replace.');
        return;
      }

      let fileDataUrl: string | undefined;
      if (file) fileDataUrl = await readFileDataUrl(file);

      updateDocument(editingDoc.id, {
        title: title || 'Document',
        docType,
        domain,
        category,
        memberId: docType === 'purchase_receipt' ? undefined : memberId || undefined,
        assetId: editAssetId || undefined,
        expiryDate: docExpiry,
        fields: normalizedFields,
        notes: notes.trim() || undefined,
        verificationStatus: 'verified',
        ...(file
          ? {
              fileName: file.name,
              fileDataUrl,
            }
          : {}),
      });

      if (needsValidation || editingDoc.verificationStatus === 'pending') {
        useVaultStore.getState().logActivity('verified', {}, editingDoc.id);
      }

      navigate(`/documents/${editingDoc.id}`);
      return;
    }
    if (!stagedDocId) {
      setLimitError('No document to verify.');
      return;
    }
    if (!canUploadDocument(user, verifiedCount)) {
      setLimitError(
        'You\'ve reached your free plan limit. Invite friends to earn more upload space, or upgrade to Pro.',
      );
      return;
    }

    let finalAssetId = assetId;
    const normalizedFields = normalizeDocFields(docType, fields);
    const docExpiry = documentExpiryFromFields(docType, normalizedFields, expiryDate || undefined);

    if (isPurchase && !underWarranty) {
      setLimitError('Please confirm if this item is under warranty.');
      return;
    }

    if (isPurchase && underWarranty === 'yes' && !normalizedFields.warrantyUntil) {
      setLimitError('Enter warranty duration to calculate validity date.');
      return;
    }

    if (isPurchase && !finalAssetId) {
      if (!canAddAsset(user, assets.length)) {
        setLimitError('Asset limit reached on your plan. Upgrade to Pro for unlimited vehicles and purchases.');
        return;
      }
      finalAssetId = addAsset({
        type: 'purchase',
        label: title || 'Purchase',
        ownedByMemberId: memberId || undefined,
        purchaseFields: {
          productName: normalizedFields.productName || title,
          amount: Number(normalizedFields.amount) || 0,
          currency: 'INR',
          purchaseDate: normalizedFields.purchaseDate || new Date().toISOString().slice(0, 10),
          storeName: normalizedFields.storeName || 'Store',
          warrantyUntil: normalizedFields.warrantyUntil || undefined,
        },
      });
      if (!finalAssetId) {
        setLimitError('Could not create asset.');
        return;
      }
    }

    const ok = verifyDocument(stagedDocId, {
      title: title || 'Document',
      expiryDate: docExpiry,
      fields: normalizedFields,
      notes: notes.trim() || undefined,
      ...(finalAssetId ? { assetId: finalAssetId } : {}),
      ...(memberId && !isPurchase ? { memberId } : {}),
    });

    if (!ok) {
      setLimitError('Could not verify document. Check your plan limits.');
      return;
    }

    if (isHealth && memberId) {
      navigate(`/health/${memberId}`);
    } else if (isPurchase) {
      navigate(`/assets/${finalAssetId}`);
    } else if (memberId) {
      navigate(`/family/${memberId}`);
    } else {
      navigate(backTo);
    }
  };

  const docTypes: { value: DocType; label: string }[] = useMemo(() => {
    if (isHealth) {
      return [
        { value: 'health_insurance', label: 'Health insurance' },
        { value: 'lab_report', label: 'Lab report' },
        { value: 'prescription', label: 'Prescription' },
        { value: 'vaccination', label: 'Vaccination' },
        { value: 'medical_bill', label: 'Medical bill' },
        { value: 'discharge_summary', label: 'Discharge summary' },
      ];
    }
    return [
      { value: 'passport', label: 'Passport' },
      { value: 'vehicle_rc', label: 'RC' },
      { value: 'vehicle_insurance', label: 'Vehicle insurance' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'purchase_receipt', label: 'Purchase / Invoice' },
      { value: 'other', label: 'Other' },
    ];
  }, [isHealth]);

  const handleEditDocTypeChange = (next: DocType) => {
    setDocType(next);
    setFields(emptyFieldsFor(next));
    setExpiryDate('');
    setDuplicate(null);
    setCategory(categoryForDocType(next));
    setDomain(
      defaultDomainForDocType(next, {
        memberId,
        assetId: editAssetId || undefined,
        uploadContext: isHealth ? 'health' : undefined,
      }),
    );
    if (next === 'purchase_receipt') {
      setUnderWarranty('');
      setWarrantyDuration('');
    } else {
      setUnderWarranty('');
    }
  };

  const replaceDocumentFile = async (picked: File | null) => {
    setFile(picked);
    setReplacedFile(Boolean(picked));
    if (!picked) {
      setNeedsValidation(false);
      return;
    }
    setOcrLoading(true);
    setLimitError('');
    try {
      const result = await extractOnDevice(picked.name, docType);
      const mapped = normalizeDocFields(docType, result.fields);
      setFields(mapped);
      if (result.expiryDate) setExpiryDate(result.expiryDate);
      const docTitle = mapped.productName
        ? mapped.productName
        : picked.name.replace(/\.[^.]+$/, '');
      if (docTitle) setTitle(docTitle);
      const dup = findDuplicate(
        documents.filter((d) => d.id !== editId),
        docType,
        result.fields,
      );
      setDuplicate(dup?.title ?? null);
      setNeedsValidation(true);
    } finally {
      setOcrLoading(false);
    }
  };

  const domainOptions = useMemo(() => domainsForDocType(docType), [docType]);
  const categoryOptions = useMemo(() => categoriesForDocType(docType), [docType]);
  const domainSelectDisabled = domainOptions.length <= 1;
  const categorySelectDisabled = categoryOptions.length <= 1;

  const showAssetLink =
    domain === 'assets' || Boolean(editAssetId) || ASSET_DOC_TYPES.includes(docType);

  const pageTitle = isEdit
    ? 'Edit document'
    : isCamera
      ? 'Scan document'
      : isHealth
        ? 'Add health record'
        : 'Add document';

  return (
    <div className="min-h-full pb-28">
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
            Verify pending documents before uploading more.{' '}
            <Link to={`/upload?verify=${documents.find((d) => d.verificationStatus === 'pending')?.id ?? ''}`} className="text-accent-ink">
              Verify now
            </Link>
          </p>
        )}
        {limitError && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{limitError}</p>
        )}
        {step === 'pick' && !params.get('verify') && (
          <>
            {!file ? (
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
                      className="hidden"
                      onChange={handlePickInput}
                    />
                    Tap to choose photo or PDF
                  </label>
                )}

                {!isCamera && (
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => {
                      setFile(null);
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
                  onClick={openFilePicker}
                  className="surface-panel flex min-h-20 w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border p-4 text-center text-sm"
                >
                  <p className="font-medium text-text">{file.name}</p>
                  <p className="mt-1 text-xs text-muted">Tap to choose a different file</p>
                </button>

                {!isCamera && (
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => {
                      setFile(null);
                      const next = new URLSearchParams(params);
                      next.set('source', 'camera');
                      navigate(`/upload?${next.toString()}`);
                    }}
                  >
                    📷 Scan with camera instead
                  </Button>
                )}

            <Select
              label="Document type"
              value={docType}
              onChange={(e) => {
                const next = e.target.value as DocType;
                setDocType(next);
                setFields(emptyFieldsFor(next));
              }}
            >
              {docTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            {!isPurchase && (
              <Select label="Family member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{memberSelectLabel(m)}</option>
                ))}
              </Select>
            )}

            <RadioGroup
              label="How to process"
              name="extract"
              value={extractMode}
              onChange={setExtractMode}
              options={[
                { value: 'on_device', label: 'On-device OCR', hint: 'Private — stays on your phone' },
                {
                  value: 'cloud',
                  label: 'Cloud AI (Pro)',
                  hint: 'Sends image for better accuracy',
                  disabled: !(settings.cloudAiEnabled && user?.plan === 'pro'),
                },
                { value: 'manual', label: 'Manual entry', hint: 'Store file without extraction' },
              ]}
            />

            <Button
              className="w-full"
              disabled={!file || !canStage}
              onClick={() =>
                extractMode === 'manual' ? void continueManual() : void runExtract()
              }
            >
              Continue
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={!canStage}
              onClick={() => {
                setTitle(file?.name ?? 'Document');
                void continueManual();
              }}
            >
              Store only (manual entry)
            </Button>
              </>
            )}
          </>
        )}

        {step === 'verify' && isEdit && editingDoc && (
          <>
            <label className="surface-panel flex min-h-28 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-accent/35 bg-accent-soft/30 p-4 text-center">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => void replaceDocumentFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-sm font-semibold text-text">Replace document</p>
              <p className="mt-1 text-xs text-muted">
                {file
                  ? `Selected: ${file.name}`
                  : editingDoc.fileName
                    ? `Current: ${editingDoc.fileName}`
                    : 'Tap to choose a new photo or PDF'}
              </p>
              <p className="mt-1 text-[0.65rem] text-muted">OCR runs after you pick — review fields before saving</p>
            </label>

            {needsValidation && !ocrLoading && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
                <p className="font-medium text-text">Review scan results</p>
                <p className="mt-1 text-xs text-muted">
                  Check extracted fields below, update anything incorrect, then validate and save.
                </p>
              </div>
            )}

            {duplicate && (
              <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                Similar document exists: {duplicate}. Saving anyway.
              </p>
            )}

            <section className="space-y-3">
              <p className="section-label">Details</p>
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Select
                  label="Document type"
                  value={docType}
                  onChange={(e) => handleEditDocTypeChange(e.target.value as DocType)}
                >
                  {ALL_DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                {docType !== 'purchase_receipt' && members.length > 0 && (
                  <Select label="Family member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{memberSelectLabel(m)}</option>
                    ))}
                  </Select>
                )}
                <Select
                  label="Tab tag"
                  value={domain}
                  disabled={domainSelectDisabled}
                  onChange={(e) => setDomain(e.target.value as DocDomain)}
                >
                  {domainOptions.map((d) => (
                    <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
                  ))}
                </Select>
                <Select
                  label="Category tag"
                  value={category}
                  disabled={categorySelectDisabled}
                  onChange={(e) => setCategory(e.target.value as DocCategory)}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </Select>
                {showAssetLink && (
                  <Select
                    label="Linked asset"
                    value={editAssetId}
                    onChange={(e) => setEditAssetId(e.target.value)}
                  >
                    <option value="">None</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </Select>
                )}
                {!usesFieldBasedExpiry(docType) && (
                  <Input
                    label="Expiry date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                )}
              </div>
            </section>

            {isPurchase && (
              <section className="space-y-3">
                <p className="section-label">Warranty</p>
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
                  <div className="grid grid-cols-2 gap-3">
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
              </section>
            )}

            {fieldSchemaFor(docType).filter((f) => !(isPurchase && f.key === 'warrantyUntil')).length > 0 && (
              <section className="space-y-3">
                <p className="section-label">Extracted fields</p>
                <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                  {fieldSchemaFor(docType)
                    .filter((f) => !(isPurchase && f.key === 'warrantyUntil'))
                    .map((f) => (
                      <Input
                        key={f.key}
                        label={f.label}
                        type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                        value={fields[f.key] ?? ''}
                        onChange={(e) => {
                          const next = { ...fields, [f.key]: e.target.value };
                          setFields(next);
                          if (usesFieldBasedExpiry(docType)) {
                            const mapped = documentExpiryFromFields(docType, next);
                            if (mapped) setExpiryDate(mapped);
                          }
                        }}
                      />
                    ))}
                </div>
              </section>
            )}

            <Textarea
              label="Notes (optional)"
              placeholder="Extra details that are not standard fields for this document type"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button className="w-full" disabled={ocrLoading} onClick={() => void save()}>
              {needsValidation ? 'Validate and save' : 'Save changes'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
          </>
        )}

        {step === 'verify' && !isEdit && (
          <>
            <p className="text-xs text-muted">
              Review extracted fields — your document is saved as pending until you confirm.
            </p>
            {duplicate && (
              <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                ⚠ Similar document exists: {duplicate}. Saving anyway.
              </p>
            )}
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            {!usesFieldBasedExpiry(docType) && (
              <Input label="Expiry date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            )}
            {isPurchase && (
              <>
                <RadioGroup
                  label="Under warranty?"
                  name="underWarranty"
                  value={underWarranty}
                  onChange={(v) => setUnderWarranty(v as 'yes' | 'no')}
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                />
                {underWarranty === 'yes' && (
                  <div className="grid grid-cols-2 gap-3">
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
                    Warranty valid until: <span className="font-medium text-text">{formatDate(fields.warrantyUntil)}</span>
                  </p>
                )}
              </>
            )}
            {fieldSchemaFor(docType)
              .filter((f) => !(isPurchase && f.key === 'warrantyUntil'))
              .map((f) => (
              <Input
                key={f.key}
                label={f.label}
                type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                value={fields[f.key] ?? ''}
                onChange={(e) => {
                  const next = { ...fields, [f.key]: e.target.value };
                  setFields(next);
                  if (usesFieldBasedExpiry(docType)) {
                    const mapped = documentExpiryFromFields(docType, next);
                    if (mapped) setExpiryDate(mapped);
                  }
                }}
              />
            ))}
            <Textarea
              label="Notes (optional)"
              placeholder="Extra details that are not standard fields for this document type"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button className="w-full" onClick={() => void save()}>
              Confirm & save
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                if (stagedDocId && resumeDoc?.verificationStatus === 'pending') {
                  deleteDocument(stagedDocId);
                }
                setStagedDocId(null);
                setStep('pick');
                navigate(backTo.includes('upload') ? backTo : `/upload?${params.toString()}`);
              }}
            >
              Cancel
            </Button>
          </>
        )}
      </main>
      <BottomNav />
      <LoadingOverlay open={ocrLoading || processing} label={ocrLoading ? 'Scanning document…' : 'Processing…'} />
    </div>
  );
}
