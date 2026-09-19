import React, { useState } from 'react';
import {
  TabType,
  EvidenceSource,
  WarningSign,
  CheckInRecord,
  MedicationTask,
  ActivityTask,
} from './types';
import {
  mockPatient,
  mockWarningSigns,
  mockFollowUp,
  mockTodayMedications,
  mockTodayActivities,
  mock14DayPlan,
} from './data/mockDischargeData';
import { PhoneFrame } from './components/PhoneFrame';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeTab } from './components/tabs/HomeTab';
import { PlanTab } from './components/tabs/PlanTab';
import { CheckInTab } from './components/tabs/CheckInTab';
import { MoreTab } from './components/tabs/MoreTab';
import { EvidenceModal } from './components/EvidenceModal';
import { SafetyAlertModal } from './components/SafetyAlertModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { AwsArchitectureModal } from './components/AwsArchitectureModal';
import { UploadModal } from './components/UploadModal';
import { DesktopView } from './components/DesktopView';
import { CarePathApi } from './services/api';

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(2);

  // Application Data State
  const [patient, setPatient] = useState(mockPatient);
  const [medications, setMedications] = useState<MedicationTask[]>(mockTodayMedications);
  const [activities, setActivities] = useState<ActivityTask[]>(mockTodayActivities);
  const [warningSigns, setWarningSigns] = useState<WarningSign[]>(mockWarningSigns);
  const [followUp, setFollowUp] = useState(mockFollowUp);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([
    {
      id: 'checkin-day1',
      timestamp: 'Yesterday, 8:30 PM',
      dayNumber: 1,
      pain: 'same',
      fever: 'no',
      breathing: 'normal',
      notes: 'Discharged from hospital, rested well.',
      warningMatched: false,
    },
  ]);

  // Load live data from backend API
  const refreshActivePlan = () => {
    CarePathApi.getActiveRecoveryPlan()
      .then((plan) => {
        if (plan && plan.patient) {
          setPatient((prev) => ({
            ...prev,
            name: plan.patient.name || prev.name,
            procedure: plan.patient.procedure || prev.procedure,
            attendingPhysician: plan.patient.attendingPhysician || prev.attendingPhysician,
          }));
        }
        if (plan?.medications?.length) {
          setMedications(plan.medications);
        }
        if (plan?.activities?.length) {
          setActivities(plan.activities);
        }
        if (plan?.warningSigns?.length) {
          setWarningSigns(plan.warningSigns);
        }
        if (plan?.followUp) {
          setFollowUp(plan.followUp);
        }
      })
      .catch((err) => {
        console.warn('Using baseline verified recovery data:', err);
      });

    CarePathApi.getCheckInHistory()
      .then((history) => {
        if (history && history.length > 0) {
          setCheckInHistory(history);
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    refreshActivePlan();
  }, []);

  // Modals & Overlays
  const [activeEvidence, setActiveEvidence] = useState<{
    evidence: EvidenceSource;
    title: string;
  } | null>(null);

  const [activeSafetyWarning, setActiveSafetyWarning] = useState<WarningSign | null>(null);
  const [docViewerState, setDocViewerState] = useState<{
    isOpen: boolean;
    page: number;
  }>({
    isOpen: false,
    page: 1,
  });

  const [isAwsArchOpen, setIsAwsArchOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Task Toggle Handlers
  const handleToggleMedication = (id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleToggleActivity = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  // Evidence Modal Triggers
  const handleShowEvidence = (evidence: EvidenceSource, title: string) => {
    setActiveEvidence({ evidence, title });
  };

  // Document Viewer Triggers
  const handleOpenDocumentViewer = (pageNumber: number = 1) => {
    setDocViewerState({ isOpen: true, page: pageNumber });
  };

  // Check-In Submission
  const handleCheckInSubmitted = (record: CheckInRecord, matchedWarning: WarningSign | null) => {
    setCheckInHistory((prev) => [record, ...prev]);
    if (matchedWarning) {
      setActiveSafetyWarning(matchedWarning);
    }
  };

  // Trigger Breathing Alert (Hackathon Judging Shortcut)
  const handleTriggerBreathingAlert = () => {
    const breathingWarning = mockWarningSigns.find((w) => w.triggerKey === 'breathing') || mockWarningSigns[0];
    setActiveSafetyWarning(breathingWarning);
  };

  // Reset Demo State
  const handleResetDemo = () => {
    setPatient(mockPatient);
    setMedications(mockTodayMedications);
    setActivities(mockTodayActivities);
    setCurrentTab('home');
    setSelectedPlanDay(2);
    setActiveSafetyWarning(null);
    setActiveEvidence(null);
  };

  const remainingMedCount = medications.filter((m) => !m.completed).length;
  const remainingActCount = activities.filter((a) => !a.completed).length;
  const totalRemainingTasks = remainingMedCount + remainingActCount;
  const hasCompletedCheckInToday = checkInHistory.some((c) => c.dayNumber === 2);

  return (
    <>
      {viewMode === 'desktop' ? (
        <DesktopView
          patient={patient}
          medications={medications}
          activities={activities}
          warningSigns={warningSigns}
          followUp={followUp}
          checkInHistory={checkInHistory}
          selectedPlanDay={selectedPlanDay}
          plans={mock14DayPlan}
          onSelectPlanDay={setSelectedPlanDay}
          onToggleMedication={handleToggleMedication}
          onToggleActivity={handleToggleActivity}
          onShowEvidence={handleShowEvidence}
          onOpenDocumentViewer={handleOpenDocumentViewer}
          onCheckInSubmitted={handleCheckInSubmitted}
          onOpenAwsArch={() => setIsAwsArchOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onTriggerBreathingAlert={handleTriggerBreathingAlert}
          onResetDemo={handleResetDemo}
          onSwitchToMobile={() => setViewMode('mobile')}
        />
      ) : (
        <PhoneFrame
          onOpenAwsArch={() => setIsAwsArchOpen(true)}
          onOpenDocumentViewer={handleOpenDocumentViewer}
          onTriggerBreathingAlert={handleTriggerBreathingAlert}
          onResetDemo={handleResetDemo}
          onOpenUpload={() => setIsUploadOpen(true)}
          onSwitchToDesktop={() => setViewMode('desktop')}
          bottomNav={
            <BottomNavigation
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              pendingCheckIn={!hasCompletedCheckInToday}
              remainingTasksCount={totalRemainingTasks}
            />
          }
        >
          {/* Dynamic Tab Body */}
          <div className="grow">
            {currentTab === 'home' && (
              <HomeTab
                patient={patient}
                medications={medications}
                activities={activities}
                followUp={followUp}
                warningSigns={warningSigns}
                onToggleMedication={handleToggleMedication}
                onToggleActivity={handleToggleActivity}
                onShowEvidence={handleShowEvidence}
                onNavigateToCheckIn={() => setCurrentTab('checkin')}
                onNavigateToPlan={() => setCurrentTab('plan')}
                onViewDocumentPage={handleOpenDocumentViewer}
                hasCompletedCheckInToday={hasCompletedCheckInToday}
              />
            )}

            {currentTab === 'plan' && (
              <PlanTab
                plans={mock14DayPlan}
                selectedDay={selectedPlanDay}
                onSelectDay={setSelectedPlanDay}
                onShowEvidence={handleShowEvidence}
                onViewDocumentPage={handleOpenDocumentViewer}
              />
            )}

            {currentTab === 'checkin' && (
              <CheckInTab
                onCheckInSubmitted={handleCheckInSubmitted}
                warningSigns={warningSigns}
                checkInHistory={checkInHistory}
                onViewDocumentPage={handleOpenDocumentViewer}
              />
            )}

            {currentTab === 'more' && (
              <MoreTab
                patient={patient}
                onOpenDocumentViewer={handleOpenDocumentViewer}
                onOpenAwsArch={() => setIsAwsArchOpen(true)}
                onOpenUpload={() => setIsUploadOpen(true)}
                onResetDemo={handleResetDemo}
              />
            )}
          </div>
        </PhoneFrame>
      )}

      {/* Signature CarePath Interaction: "Why this? →" Evidence Modal */}
      {activeEvidence && (
        <EvidenceModal
          evidence={activeEvidence.evidence}
          itemTitle={activeEvidence.title}
          onClose={() => setActiveEvidence(null)}
          onViewDocumentPage={(page) => {
            setActiveEvidence(null);
            handleOpenDocumentViewer(page);
          }}
        />
      )}

      {/* Non-Diagnostic Safety Warning Modal */}
      {activeSafetyWarning && (
        <SafetyAlertModal
          warningSign={activeSafetyWarning}
          onClose={() => setActiveSafetyWarning(null)}
          onViewDocumentPage={(page) => {
            setActiveSafetyWarning(null);
            handleOpenDocumentViewer(page);
          }}
          hospitalHelpline={patient.hospitalHelpline}
        />
      )}

      {/* 5-Page Discharge Document Viewer Modal */}
      {docViewerState.isOpen && (
        <DocumentViewerModal
          initialPage={docViewerState.page}
          onClose={() => setDocViewerState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* AWS Architecture & Pipeline Modal (for Hackathon Judges) */}
      {isAwsArchOpen && (
        <AwsArchitectureModal onClose={() => setIsAwsArchOpen(false)} />
      )}

      {/* Upload & Ingestion State Machine Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onProcessingComplete={() => {
            refreshActivePlan();
            setCurrentTab('home');
          }}
        />
      )}
    </>
  );
}
