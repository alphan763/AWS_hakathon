import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAwsStatus,
  checkLocalStackConnectivity,
  getLocalStackEndpoint,
  isAwsCredentialsConfigured,
} from './server/awsClient';
import { DocumentService } from './server/documentService';
import { CheckInService } from './server/checkInService';
import { NotificationService } from './server/notification/notificationService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parser for document uploads and check-in records
  app.use(express.json({ limit: '50mb' }));

  // ==========================================
  // Health & Architecture Status Endpoints
  // ==========================================

  const buildHealthPayload = async () => {
    const isLocalStackUp = await checkLocalStackConnectivity();
    const isLiveAws = isAwsCredentialsConfigured();

    return {
      status: 'ok',
      environment: isLiveAws ? 'aws' : 'local',
      timestamp: new Date().toISOString(),
      services: {
        s3: isLocalStackUp ? 'connected' : 'demo_fallback',
        dynamodb: isLocalStackUp ? 'connected' : 'demo_fallback',
        sns: isLocalStackUp ? 'connected' : 'demo_fallback',
        clinicalAI: 'fixture',
        extraction: 'local',
      },
      activeMode: isLiveAws
        ? 'LIVE_AWS_SERVICES'
        : isLocalStackUp
        ? 'LOCALSTACK_EMULATION (S3, DynamoDB, SNS)'
        : 'LOCAL_DEMO_FALLBACK (Resilient in-memory & verified fixtures)',
      localstack: {
        endpoint: getLocalStackEndpoint(),
        connected: isLocalStackUp,
      },
      disclaimer: 'Demo patient · Fictional clinical data · Local AWS emulation',
    };
  };

  // 1. Root /health & /api/health
  app.get('/health', async (req, res) => {
    const payload = await buildHealthPayload();
    res.json(payload);
  });

  app.get('/api/health', async (req, res) => {
    const payload = await buildHealthPayload();
    res.json(payload);
  });

  app.get('/api/health/aws-status', (req, res) => {
    res.json(getAwsStatus());
  });

  // ==========================================
  // Document Ingestion & Pipeline Endpoints
  // ==========================================

  // 2. Upload Document & Ingest Pipeline
  app.post('/api/documents/upload', async (req, res) => {
    try {
      const { filename = 'discharge_instructions.pdf', fileBase64, isDemo = false } = req.body;
      let buffer: Buffer | undefined;

      if (fileBase64) {
        // Strip data url prefix if present
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      }

      const result = await DocumentService.runEndToEndPipeline(
        filename,
        buffer,
        Boolean(isDemo)
      );

      res.status(200).json({
        success: true,
        document: result.document,
        recoveryPlan: result.recoveryPlan,
      });
    } catch (error) {
      console.error('[API] Document upload error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to process document through pipeline',
      });
    }
  });

  // 3. Document Processing Status
  app.get('/api/documents/:id/status', (req, res) => {
    const doc = DocumentService.getDocumentRecord(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
      updated_at: doc.updated_at,
      page_count: doc.page_count,
    });
  });

  // 4. Document Textract Normalized Pages
  app.get('/api/documents/:id/pages', (req, res) => {
    const pagesOutput = DocumentService.getDocumentPages(req.params.id);
    if (!pagesOutput) {
      const activePlan = DocumentService.getRecoveryPlan('active');
      if (activePlan?.pages) {
        return res.json({
          document_id: req.params.id,
          pages: activePlan.pages,
        });
      }
      return res.status(404).json({ error: 'Pages not found' });
    }
    res.json(pagesOutput);
  });

  // 5. Active or Specific Recovery Plan
  app.get('/api/recovery-plan/active', (req, res) => {
    const plan = DocumentService.getRecoveryPlan('active');
    if (!plan) {
      return res.status(404).json({ error: 'No active recovery plan available' });
    }
    res.json(plan);
  });

  app.get('/api/recovery-plan/:id', (req, res) => {
    const plan = DocumentService.getRecoveryPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Recovery plan not found' });
    }
    res.json(plan);
  });

  // ==========================================
  // Check-In & Red-Flag Escalation Endpoints
  // ==========================================

  // 6. Submit Daily Check-In & Deterministic Warning Match
  app.post('/api/check-in', async (req, res) => {
    try {
      const { dayNumber = 2, pain, fever, breathing, notes, documentId } = req.body;

      if (!pain || !fever || !breathing) {
        return res.status(400).json({
          error: 'Missing required check-in fields: pain, fever, breathing',
        });
      }

      const result = await CheckInService.recordCheckIn({
        dayNumber,
        pain,
        fever,
        breathing,
        notes,
        documentId,
      });

      res.status(200).json({
        success: true,
        record: result,
      });
    } catch (error) {
      console.error('[API] Check-in error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to record check-in',
      });
    }
  });

  // 7. Check-In History
  app.get('/api/check-in/history', (req, res) => {
    res.json(CheckInService.getHistory());
  });

  // 8. Caregiver Alert Logs & Simulator History
  app.get('/api/alerts/history', (req, res) => {
    res.json(NotificationService.getAlertHistory());
  });

  // 9. SNS Notification Trigger Test
  app.post('/api/alerts/sns-test', async (req, res) => {
    try {
      const { symptom = 'Difficulty breathing', day = 2 } = req.body;
      const result = await CheckInService.sendSnsAlert(
        {
          dayNumber: day,
          pain: 'same',
          fever: 'no',
          breathing: 'difficult',
        },
        {
          condition: symptom,
          documentedAction:
            'Call the hospital emergency line immediately (+1 800 555-0199) or proceed to Emergency Room.',
          sourcePage: 5,
        }
      );

      res.json({
        success: true,
        sns: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ==========================================
  // Pre-seed default recovery plan on start
  // ==========================================
  try {
    await DocumentService.runEndToEndPipeline(
      'Mrs_Sharma_PostOp_Cholecystectomy.pdf',
      undefined,
      true
    );
    console.log('[CarePath] Seeded verified demo recovery plan in memory & store');
  } catch (err) {
    console.warn('[CarePath] Seed warning:', err);
  }

  // ==========================================
  // Vite Middleware & Static Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CarePath backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
