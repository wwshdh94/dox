import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input, RadioGroup, Select } from '@/components/Input';
import { extractOnDevice, findDuplicate } from '@/lib/ocr';
import { readFileDataUrl } from '@/lib/files';
import { inferDocTags } from '@/lib/docTags';
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
import type { DocType } from '@/types';

type ExtractMode = 'manual' | 'on_device' | 'cloud';

export function UploadPage() {
  const [params] = useSearchParams();
  const assets = useVaultStore((s) => s.assets);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const settings = useVaultStore((s) => s.settings);
  const user = useVaultStore((s) => s.user);
  const addDocument = useVaultStore((s) => s.addDocument);
  const verifyDocument = useVaultStore((s) => s.verifyDocument);
  const deleteDocument = useVaultStore((s) => s.deleteDocument);
  const addAsset = useVaultStore((s) => s.addAsset);
  const updateAsset = useVaultStore((s) => s.updateAsset);

  const [file, setFile] = useState<File | null>(null);
  const [extractMode, setExtractMode] = useState<ExtractMode>('on_device');
  const [step, setStep] = useState<'pick' | 'verify'>(params.get('verify') ? 'verify' : 'pick');
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
  const [fields, setFields] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [limitError, setLimitError] = useState('');
  const [stagedDocId, setStagedDocId] = useState<string | null>(params.get('verify'));
  const navigate = useNavigate();
  const backTo = uploadBackPath(params);
  const verifiedCount = countVerifiedDocuments(documents);
  const uploadsLeft = user ? remainingUploads(user, verifiedCount) : null;
  const assetSlotsLeft = user ? remainingAssetSlots(user, assets.length) : null;
  const verifySlotsLeft = user ? remainingVerificationSlots(user, documents) : null;
  const canStage = canStageDocument(user, documents);

  const isPurchase = docType === 'purchase_receipt' || params.get('type') === 'purchase';
  const isCamera = params.get('source') === 'camera';
  const resumeDoc = stagedDocId ? documents.find((d) => d.id === stagedDocId) : undefined;

  useEffect(() => {
    if (!resumeDoc) return;
    setStep('verify');
    setTitle(resumeDoc.title);
    setExpiryDate(resumeDoc.expiryDate ?? '');
    const mapped: Record<string, string> = {};
    Object.entries(resumeDoc.fields).forEach(([k, v]) => {
      mapped[k] = String(v ?? '');
    });
    setFields(mapped);
    if (resumeDoc.memberId) setMemberId(resumeDoc.memberId);
    if (resumeDoc.docType) setDocType(resumeDoc.docType);
  }, [resumeDoc?.id]);

  const stageForVerification = async (initialFields: Record<string, string>, docTitle: string) => {
    setLimitError('');
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

    const id = addDocument({
      title: docTitle || 'Document',
      docType,
      domain: tags.domain,
      category: tags.category,
      memberId: isPurchase ? undefined : memberId || undefined,
      assetId: assetId || undefined,
      expiryDate: expiryDate || undefined,
      fields: initialFields,
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
    const result = await extractOnDevice(file.name, docType);
    const mapped: Record<string, string> = {};
    Object.entries(result.fields).forEach(([k, v]) => {
      mapped[k] = String(v);
    });
    setFields(mapped);
    if (mapped.expiryDate) setExpiryDate(mapped.expiryDate);
    const docTitle = mapped.productName
      ? String(mapped.productName)
      : file.name.replace(/\.[^.]+$/, '');
    setTitle(docTitle);

    const dup = findDuplicate(documents, docType, result.fields);
    if (dup) setDuplicate(dup.title);

    if (result.confidence < 0.6 && extractMode !== 'cloud') {
      // low confidence — user can switch to cloud on Pro
    }
    await stageForVerification(mapped, docTitle);
  };

  const continueManual = async () => {
    const docTitle = title || file?.name.replace(/\.[^.]+$/, '') || 'Document';
    setTitle(docTitle);
    await stageForVerification(fields, docTitle);
  };

  const save = async () => {
    setLimitError('');
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
          productName: title,
          amount: Number(fields.amount) || 0,
          currency: 'INR',
          purchaseDate: fields.purchaseDate || new Date().toISOString().slice(0, 10),
          storeName: fields.storeName || 'Store',
          storePhone: fields.storePhone,
          warrantyUntil: expiryDate || fields.warrantyUntil,
        },
      });
      if (!finalAssetId) {
        setLimitError('Could not create asset.');
        return;
      }
    }

    const ok = verifyDocument(stagedDocId, {
      title: title || 'Document',
      expiryDate: expiryDate || undefined,
      fields,
      ...(finalAssetId ? { assetId: finalAssetId } : {}),
      ...(memberId && !isPurchase ? { memberId } : {}),
    });

    if (!ok) {
      setLimitError('Could not verify document. Check your plan limits.');
      return;
    }

    if (finalAssetId && fields.warrantyUntil) {
      updateAsset(finalAssetId, {
        purchaseFields: {
          ...(assets.find((a) => a.id === finalAssetId)?.purchaseFields ?? {
            productName: title,
            amount: 0,
            currency: 'INR',
            purchaseDate: new Date().toISOString().slice(0, 10),
            storeName: '',
          }),
          warrantyUntil: expiryDate,
        },
      });
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

  return (
    <div className="min-h-full pb-28">
      <Header
        title={isCamera ? 'Scan document' : isHealth ? 'Add health record' : 'Add document'}
        backFallback={backTo}
      />
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
            {isCamera ? (
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/35 bg-accent-soft/50 p-6 text-center text-sm shadow-sm">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    setFile(picked);
                    if (picked) {
                      setExtractMode('on_device');
                      setTitle(picked.name.replace(/\.[^.]+$/, ''));
                    }
                  }}
                />
                <span className="text-4xl">📷</span>
                <p className="mt-3 font-medium text-text">
                  {file ? file.name : 'Tap to open camera'}
                </p>
                <p className="mt-1 text-xs text-muted">Take a photo of your document</p>
              </label>
            ) : (
              <label className="surface-panel flex min-h-36 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border p-6 text-sm text-muted">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? file.name : 'Tap to choose photo or PDF'}
              </label>
            )}

            {!isCamera && (
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('source', 'camera');
                  navigate(`/upload?${next.toString()}`);
                }}
              >
                📷 Scan with camera instead
              </Button>
            )}

            <Select label="Document type" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
              {docTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            {!isPurchase && (
              <Select label="Family member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
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

        {step === 'verify' && (
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
            <Input label="Expiry date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            {Object.keys(fields).map((k) => (
              <Input
                key={k}
                label={k}
                value={fields[k] ?? ''}
                onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
              />
            ))}
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
    </div>
  );
}
