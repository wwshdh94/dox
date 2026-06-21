import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingOverlay } from '@/components/LoadingScreen';
import { Input, RadioGroup, Select, Textarea } from '@/components/Input';
import { extractOnDevice, findDuplicate } from '@/lib/ocr';
import { readFileDataUrl } from '@/lib/files';
import { inferDocTags, CATEGORY_LABELS, DOC_CATEGORIES, DOC_DOMAINS, DOMAIN_LABELS, suggestedCategoryForDocType, suggestedDomainForDocType, resolveDocTags } from '@/lib/docTags';
import { memberSelectLabel } from '@/lib/family';
import { emptyFieldsFor, fieldSchemaFor, normalizeDocFields, documentExpiryFromFields, computeWarrantyEndDate, usesFieldBasedExpiry } from '@/lib/docFields';
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
import { getDocumentsNeedingReview, isDocumentUnderReview } from '@/lib/documentReview';
import { checkCanAddDocument } from '@/lib/documentLimits';
import { isEditableCameraImage } from '@/lib/imageEdit';
import type { UploadNavigationState } from '@/lib/uploadNavigation';
import {
  initialDocTypeFromUploadParams,
  initialMemberIdFromUploadParams,
} from '@/lib/uploadNavigation';
import { ImageEditor } from '@/components/ImageEditor';
import { useVaultStore } from '@/store/useVaultStore';
import type { DocCategory, DocDomain, DocType } from '@/types';

type ExtractMode = 'on_device' | 'cloud';

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

  const editId = params.get('edit') ?? '';
  const isEdit = Boolean(editId);
  const editingDoc = isEdit ? documents.find((d) => d.id === editId) : undefined;

  const [file, setFile] = useState<File | null>(null);
  const [extractMode, setExtractMode] = useState<ExtractMode>('on_device');
  const [step, setStep] = useState<'pick' | 'edit' | 'verify'>(isEdit ? 'verify' : 'pick');
  const isHealth = params.get('context') === 'health';
  const [docType, setDocType] = useState<DocType>(() => initialDocTypeFromUploadParams(params));
  const [memberId, setMemberId] = useState(() => initialMemberIdFromUploadParams(params, members));
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
  const [replacedFile, setReplacedFile] = useState(false);
  const [needsValidation, setNeedsValidation] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [domain, setDomain] = useState<DocDomain>('family');
  const [category, setCategory] = useState<DocCategory>('identity');
  const [editAssetId, setEditAssetId] = useState('');
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

  const isPurchase = params.get('type') === 'purchase' || docType === 'purchase_receipt';
  const isCamera = params.get('source') === 'camera';

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
    setDocType(editingDoc.docType);
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

  const applyPickedFile = (picked: File, options?: { skipEdit?: boolean }) => {
    if (!options?.skipEdit && isCamera && isEditableCameraImage(picked)) {
      setFile(picked);
      setStep('edit');
      setTitle(picked.name.replace(/\.[^.]+$/, ''));
      return;
    }
    setFile(picked);
    setExtractMode('on_device');
    setTitle(picked.name.replace(/\.[^.]+$/, ''));
    setStep('pick');
  };

  useEffect(() => {
    if (isEdit || consumedNavFileRef.current) return;
    const navState = location.state as UploadNavigationState | null;
    const picked = navState?.pickedFile;
    if (!picked) return;

    consumedNavFileRef.current = true;
    applyPickedFile(picked);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [isEdit, location.pathname, location.search, location.state, navigate]);

  const handlePickInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (picked) applyPickedFile(picked);
  };

  const handleEditDone = (edited: File) => {
    applyPickedFile(edited, { skipEdit: true });
  };

  const handleRetake = () => {
    setFile(null);
    setStep('pick');
    window.setTimeout(() => cameraInputRef.current?.click(), 0);
  };

  const openFilePicker = () => {
    const input = isCamera ? cameraInputRef.current : fileInputRef.current;
    input?.click();
  };

  const submitNewUpload = async (mode: ExtractMode) => {
    if (!file) return;
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

      const fileDataUrl = await readFileDataUrl(file);
      const tags = inferDocTags(docType, {
        memberId: isPurchase ? undefined : memberId || undefined,
        assetId: assetId || undefined,
        uploadContext: isHealth ? 'health' : undefined,
      });
      const docTitle = title || file.name.replace(/\.[^.]+$/, '') || 'Document';

      const id = addDocument({
        title: docTitle,
        docType,
        domain: tags.domain,
        category: tags.category,
        memberId: isPurchase ? undefined : memberId || undefined,
        assetId: assetId || undefined,
        fields: emptyFieldsFor(docType),
        notes: notes.trim() || undefined,
        fileName: file.name,
        fileDataUrl,
        reviewStatus: 'processing',
      });

      if (!id) {
        setLimitError('Could not save document. Check your plan limits or review queue.');
        return;
      }

      navigate(`/documents/${id}`);
      void useVaultStore.getState().processNewUpload(id, {
        fileName: file.name,
        docType,
        extractMode: mode,
      });
    } finally {
      setProcessing(false);
    }
  };

  const runExtract = async () => {
    if (!file) return;
    await submitNewUpload(extractMode);
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
        reviewStatus: 'reviewed',
        verificationStatus: 'verified',
        ...(file
          ? {
              fileName: file.name,
              fileDataUrl,
            }
          : {}),
      });

      if (needsValidation || isDocumentUnderReview(editingDoc)) {
        useVaultStore.getState().logActivity('reviewed', {}, editingDoc.id);
      }

      navigate(`/documents/${editingDoc.id}`);
      return;
    }
  };

  const handleEditDocTypeChange = (next: DocType) => {
    setDocType(next);
    setFields(emptyFieldsFor(next));
    setExpiryDate('');
    setDuplicate(null);
    setCategory(suggestedCategoryForDocType(next));
    setDomain(
      suggestedDomainForDocType(next, {
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
            Review pending documents before uploading more.{' '}
            <Link to={`/documents/${getDocumentsNeedingReview(documents)[0]?.id ?? ''}`} className="text-accent-ink">
              Review now
            </Link>
          </p>
        )}
        {limitError && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{limitError}</p>
        )}
        {step === 'edit' && file && (
          <ImageEditor file={file} onDone={handleEditDone} onRetake={handleRetake} />
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

            <RadioGroup
              label="Auto extract data"
              name="extract"
              value={extractMode}
              onChange={setExtractMode}
              options={[
                { value: 'on_device', label: 'On-device', hint: 'Private — stays on your phone' },
                {
                  value: 'cloud',
                  label: 'Cloud AI',
                  hint: 'Sends image for better accuracy',
                  disabled: !(settings.cloudAiEnabled && user?.plan === 'pro'),
                },
              ]}
            />

            <Button
              className="w-full"
              disabled={!file || !canStage}
              onClick={() => void runExtract()}
            >
              Continue
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
                  onChange={(e) => setDomain(e.target.value as DocDomain)}
                >
                  {DOC_DOMAINS.map((d) => (
                    <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
                  ))}
                </Select>
                <Select
                  label="Category tag"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocCategory)}
                >
                  {DOC_CATEGORIES.map((c) => (
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

      </main>
      <BottomNav />
      <LoadingOverlay open={ocrLoading || processing} label={ocrLoading ? 'Scanning document…' : 'Processing…'} />
    </div>
  );
}
