import React from 'react';
import { WarningSign } from '../types';
import { AlertTriangle, Phone, FileText, X, ShieldAlert } from 'lucide-react';

interface SafetyAlertModalProps {
  warningSign: WarningSign | null;
  onClose: () => void;
  onViewDocumentPage?: (pageNumber: number) => void;
  hospitalHelpline?: string;
}

export const SafetyAlertModal: React.FC<SafetyAlertModalProps> = ({
  warningSign,
  onClose,
  onViewDocumentPage,
  hospitalHelpline,
}) => {
  if (!warningSign) return null;

  // Only call numbers printed in this patient's paperwork
  const callNumber =
    hospitalHelpline || warningSign.documentedAction.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/)?.[0];
  const callDigits = callNumber?.replace(/[^0-9+]/g, '');

  return (
    <div
      id="safety-alert-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-amber-950/70 backdrop-blur-xs transition-opacity p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="safety-alert-card"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-amber-400 overflow-hidden transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="p-6 sm:p-7 text-center">
          {/* Calm prominent warning emblem */}
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
            <AlertTriangle className="w-9 h-9" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-1">
            Response needs attention
          </h3>
          <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto">
            Your reported symptoms match a warning sign listed in your hospital discharge instructions.
          </p>

          {/* Matched Warning Sign Card */}
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 text-left mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Documented Warning Sign
            </div>
            <div className="text-base font-bold text-slate-900 mb-3">
              {warningSign.condition}
            </div>

            <div className="border-t border-amber-200/60 pt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Documented Action
              </div>
              <div className="text-sm font-semibold text-amber-950 bg-white/80 p-3 rounded-xl border border-amber-200/70">
                {warningSign.documentedAction}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-1">
              <span className="font-medium text-slate-500">Source:</span>
              <span className="font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md">
                Discharge Instructions — Page {warningSign.sourcePage}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {callDigits ? (
              <a
                id="call-hospital-helpline-btn"
                href={`tel:${callDigits}`}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Call Hospital Line ({callNumber})</span>
              </a>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                No hospital phone number was found in your discharge paperwork.
              </div>
            )}

            {onViewDocumentPage && (
              <button
                id="view-warning-instructions-btn"
                onClick={() => {
                  onViewDocumentPage(warningSign.sourcePage);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>View Original Document (Page {warningSign.sourcePage})</span>
              </button>
            )}

            <button
              id="acknowledge-safety-btn"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              I understand, close notice
            </button>
          </div>

          {/* Strict Safety Guardrail Note */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            No medical diagnosis. Grounded directly in your verified physician discharge document.
          </div>
        </div>
      </div>
    </div>
  );
};
