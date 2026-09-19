import React from 'react';
import { EvidenceSource } from '../types';
import { FileText, ExternalLink, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface EvidenceModalProps {
  evidence: EvidenceSource | null;
  itemTitle?: string;
  onClose: () => void;
  onViewDocumentPage?: (pageNumber: number) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidence,
  itemTitle,
  onClose,
  onViewDocumentPage,
}) => {
  if (!evidence) return null;

  return (
    <div
      id="evidence-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="evidence-modal-card"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header pull indicator for mobile */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Evidence-Linked Recovery
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Why this instruction?
                </h3>
              </div>
            </div>
            <button
              id="close-evidence-btn"
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {itemTitle && (
            <div className="mb-4 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-500">Related action</div>
              <div className="text-sm font-semibold text-slate-800">{itemTitle}</div>
            </div>
          )}

          {/* Core Evidence Box */}
          <div className="mb-4 bg-teal-50/60 rounded-2xl p-4 border border-teal-100/80">
            <div className="text-xs font-semibold text-teal-900 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-600"></span>
                Amazon Textract Verbatim Source (Page {evidence.sourcePage}):
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded font-mono">
                Verified OCR
              </span>
            </div>
            <blockquote className="text-sm italic font-medium text-slate-900 border-l-3 border-teal-600 pl-3 py-1.5 my-2 bg-white/90 rounded-r-lg shadow-2xs leading-relaxed">
              "{evidence.originalText}"
            </blockquote>
          </div>

          {/* Safety Verification Chain */}
          <div className="mb-4 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              Source Verification Chain
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              Textract OCR (Page {evidence.sourcePage}) → Bedrock Instruction Match → Verbatim Sentence Anchor
            </div>
          </div>

          {/* Source Document Details */}
          <div className="space-y-2 mb-5 text-xs text-slate-600">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Document</span>
              <span className="font-semibold text-slate-800 text-right">{evidence.documentName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Page Citation</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                Page {evidence.sourcePage} of 5
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-medium">Section</span>
              <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">{evidence.section}</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-3">
            {onViewDocumentPage && (
              <button
                id="view-original-doc-btn"
                onClick={() => {
                  onViewDocumentPage(evidence.sourcePage);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <span>View Original Document (Page {evidence.sourcePage})</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Zero-Diagnosis Safety Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Grounded in hospital paperwork • Zero LLM quotation fabrication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
