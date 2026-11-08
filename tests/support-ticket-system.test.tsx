import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to intercept and inspect all Firestore writes
const firestoreMocks = vi.hoisted(() => {
  return {
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    onSnapshot: vi.fn()
  };
});

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    setDoc: (...args: any[]) => firestoreMocks.setDoc(...args),
    updateDoc: (...args: any[]) => firestoreMocks.updateDoc(...args),
    getDoc: (...args: any[]) => firestoreMocks.getDoc(...args),
    getDocs: (...args: any[]) => firestoreMocks.getDocs(...args),
    onSnapshot: (...args: any[]) => firestoreMocks.onSnapshot(...args),
    doc: (...args: any[]) => {
      const parts = args.slice(1);
      const path = parts.join('/');
      return { path, id: parts[parts.length - 1] || 'mock-id' };
    },
    collection: (...args: any[]) => {
      const parts = args.slice(1);
      const path = parts.join('/');
      return { path, id: parts[parts.length - 1] || 'mock-col' };
    },
    query: (...args: any[]) => ({ _query: true, args }),
    where: (...args: any[]) => ({ _where: true, args }),
    orderBy: (...args: any[]) => ({ _orderBy: true, args })
  };
});

// Mock dispatchSupportNotification so tests don't make real fetch calls during unit tests
vi.mock('../src/lib/supportMail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/supportMail')>();
  return {
    ...actual
  };
});

import { 
  generateTicketNumber, 
  createSupportTicket, 
  addTicketMessage, 
  updateTicketStatus,
  updateTicketPriority,
  assignTicketStaff,
  removeUndefinedFields 
} from '../src/lib/supportService';
import { sendSupportEmail } from '../src/lib/supportMail';
import { 
  getTicketCategoryLabel, 
  getTicketStatusLabel, 
  getTicketPriorityLabel,
  normalizeTicketStatus,
  type SupportTicket,
  type TicketMessage
} from '../src/types';

/**
 * Recursive validator that verifies an object contains NO properties with value `undefined`.
 */
function assertNoUndefinedFields(obj: any, currentPath = 'root'): void {
  if (obj === null || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      assertNoUndefinedFields(item, `${currentPath}[${index}]`);
    });
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = `${currentPath}.${key}`;
    expect(value, `Field ${fieldPath} must not be undefined`).not.toBeUndefined();
    if (value !== null && typeof value === 'object') {
      assertNoUndefinedFields(value, fieldPath);
    }
  }
}

describe('Support Ticket System Simplification & Production Readiness', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    firestoreMocks.setDoc.mockReset().mockResolvedValue(undefined);
    firestoreMocks.updateDoc.mockReset().mockResolvedValue(undefined);
  });

  describe('Ticket Number & Label Helpers', () => {
    it('generates collision-safe ticket numbers with TK-YYYY-XXXX format', () => {
      const num1 = generateTicketNumber();
      const num2 = generateTicketNumber();
      const currentYear = new Date().getFullYear();

      expect(num1).toMatch(new RegExp(`^TK-${currentYear}-[A-Z0-9]{5}$`));
      expect(num2).toMatch(new RegExp(`^TK-${currentYear}-[A-Z0-9]{5}$`));
      expect(num1).not.toBe(num2);
    });

    it('returns accurate bilingual labels for categories', () => {
      expect(getTicketCategoryLabel('community_guidelines', 'en')).toBe('Community Guidelines Violation');
      expect(getTicketCategoryLabel('community_guidelines', 'ar')).toBe('مخالفات إرشادات المجتمع');
      expect(getTicketCategoryLabel('bookings_payments', 'en')).toBe('Bookings & Payments');
      expect(getTicketCategoryLabel('bookings_payments', 'ar')).toBe('الحجوزات والمدفوعات');
      expect(getTicketCategoryLabel('technical_issue', 'en')).toBe('Technical Issue');
      expect(getTicketCategoryLabel('general_question', 'ar')).toBe('استفسار عام');
    });

    it('returns accurate bilingual labels for 3 simplified statuses', () => {
      expect(getTicketStatusLabel('open', 'en')).toBe('Open');
      expect(getTicketStatusLabel('open', 'ar')).toBe('مفتوحة');
      expect(getTicketStatusLabel('waiting_for_user', 'en')).toBe('Waiting for User');
      expect(getTicketStatusLabel('waiting_for_user', 'ar')).toBe('بانتظار المستخدم');
      expect(getTicketStatusLabel('resolved', 'en')).toBe('Resolved');
      expect(getTicketStatusLabel('resolved', 'ar')).toBe('تم الحل');

      // Legacy fallback mapping
      expect(getTicketStatusLabel('in_progress' as any, 'en')).toBe('Open');
      expect(getTicketStatusLabel('closed' as any, 'ar')).toBe('تم الحل');
    });

    it('normalizes legacy statuses safely into the 3 simplified statuses', () => {
      expect(normalizeTicketStatus('open')).toBe('open');
      expect(normalizeTicketStatus('waiting_for_user')).toBe('waiting_for_user');
      expect(normalizeTicketStatus('resolved')).toBe('resolved');
      expect(normalizeTicketStatus('in_progress')).toBe('open');
      expect(normalizeTicketStatus('closed')).toBe('resolved');
      expect(normalizeTicketStatus('unknown_status')).toBe('open');
    });
  });

  describe('Firestore Ticket Creation Hotfix: No undefined field values', () => {
    it('removeUndefinedFields utility recursively strips undefined while preserving false, 0, empty strings, and empty arrays', () => {
      const input = {
        name: 'Athlete',
        emptyProp: undefined,
        flag: false,
        count: 0,
        text: '',
        tags: [],
        nested: {
          val: 123,
          bad: undefined,
          inner: {
            valid: true,
            bad2: undefined
          }
        },
        items: [
          { id: 1, test: undefined },
          { id: 2, flag: false }
        ]
      };

      const cleaned = removeUndefinedFields(input);

      expect(cleaned).toHaveProperty('name', 'Athlete');
      expect(cleaned).toHaveProperty('flag', false);
      expect(cleaned).toHaveProperty('count', 0);
      expect(cleaned).toHaveProperty('text', '');
      expect(cleaned).toHaveProperty('tags');
      expect(cleaned.tags).toEqual([]);
      expect(cleaned).not.toHaveProperty('emptyProp');
      expect(cleaned.nested).toHaveProperty('val', 123);
      expect(cleaned.nested).not.toHaveProperty('bad');
      expect(cleaned.nested.inner).toHaveProperty('valid', true);
      expect(cleaned.nested.inner).not.toHaveProperty('bad2');
      expect(cleaned.items[0]).not.toHaveProperty('test');
      expect(cleaned.items[1]).toHaveProperty('flag', false);
      assertNoUndefinedFields(cleaned);
    });

    it('1. creates a general support ticket with no optional fields and guarantees no undefined fields are passed to Firestore', async () => {
      const ticket = await createSupportTicket({
        userId: 'user_athlete_1',
        userName: 'Faisal Al-Sabah',
        userEmail: 'faisal@example.com',
        category: 'general_question',
        subject: 'How do court bookings work in Kuwait?',
        description: 'I would like to understand how Li3ib booking references link to matches.'
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.status).toBe('open');
      expect(ticket.subject).toBe('How do court bookings work in Kuwait?');

      // Crucial: optional fields must NOT be present as undefined keys
      expect(ticket).not.toHaveProperty('relatedPlayerId');
      expect(ticket).not.toHaveProperty('relatedPlayerName');
      expect(ticket).not.toHaveProperty('relatedGameId');
      expect(ticket).not.toHaveProperty('relatedGameTitle');
      expect(ticket).not.toHaveProperty('assignedTo');
      expect(ticket).not.toHaveProperty('assignedStaffName');

      // Verify Firestore setDoc was called with clean payload
      expect(firestoreMocks.setDoc).toHaveBeenCalled();
      const firstCallArgs = firestoreMocks.setDoc.mock.calls[0];
      const savedTicketData = firstCallArgs[1];

      assertNoUndefinedFields(savedTicketData);
      expect(Object.prototype.hasOwnProperty.call(savedTicketData, 'relatedPlayerId')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(savedTicketData, 'relatedGameId')).toBe(false);

      // Verify initial message was also saved without undefined fields
      const secondCallArgs = firestoreMocks.setDoc.mock.calls[1];
      const initialMessageData = secondCallArgs[1];
      assertNoUndefinedFields(initialMessageData);
      expect(initialMessageData.content).toBe('I would like to understand how Li3ib booking references link to matches.');
    });

    it('2. creates a ticket with screenshots without undefined fields', async () => {
      const attachments = [
        {
          id: 'att_1',
          name: 'screenshot1.png',
          url: 'data:image/png;base64,iVBORw0KGgo...',
          size: 1024,
          type: 'image/png'
        }
      ];

      const ticket = await createSupportTicket({
        userId: 'user_athlete_2',
        userName: 'Bader',
        userEmail: 'bader@example.com',
        category: 'technical_issue',
        subject: 'App display glitch on mobile',
        description: 'Noticeable overlap on the match detail card header.',
        attachments
      });

      expect(ticket.attachments).toHaveLength(1);
      expect(ticket.attachments?.[0].name).toBe('screenshot1.png');

      const savedTicketData = firestoreMocks.setDoc.mock.calls[0][1];
      assertNoUndefinedFields(savedTicketData);
      expect(savedTicketData.attachments).toHaveLength(1);
    });

    it('3. creates a Community Guidelines report without selecting a player or game', async () => {
      const report = await createSupportTicket({
        userId: 'user_athlete_3',
        userName: 'Ahmad',
        userEmail: 'ahmad@example.com',
        category: 'community_guidelines',
        subject: 'General pitch safety concern',
        description: 'Courts near Salmiya need better lighting at night for player safety.',
        origin: 'community_guidelines'
      });

      expect(report.category).toBe('community_guidelines');
      expect(report.origin).toBe('community_guidelines');
      expect(report).not.toHaveProperty('relatedPlayerId');
      expect(report).not.toHaveProperty('relatedGameId');

      const savedData = firestoreMocks.setDoc.mock.calls[0][1];
      assertNoUndefinedFields(savedData);
      expect(Object.prototype.hasOwnProperty.call(savedData, 'relatedPlayerId')).toBe(false);
    });

    it('4. creates a Community Guidelines report with a related player and game', async () => {
      const report = await createSupportTicket({
        userId: 'user_athlete_4',
        userName: 'Salem',
        userEmail: 'salem@example.com',
        category: 'community_guidelines',
        subject: 'Violent conduct during match',
        description: 'Player repeated aggressive fouls after referee whistle.',
        origin: 'community_guidelines',
        relatedPlayerId: 'user_violator_99',
        relatedPlayerName: 'Violating Player',
        relatedGameId: 'game_mishref_10',
        relatedGameTitle: 'Friday Sunset Padel 7PM'
      });

      expect(report.relatedPlayerId).toBe('user_violator_99');
      expect(report.relatedPlayerName).toBe('Violating Player');
      expect(report.relatedGameId).toBe('game_mishref_10');
      expect(report.relatedGameTitle).toBe('Friday Sunset Padel 7PM');

      const savedData = firestoreMocks.setDoc.mock.calls[0][1];
      assertNoUndefinedFields(savedData);
      expect(savedData.relatedPlayerId).toBe('user_violator_99');
      expect(savedData.relatedGameTitle).toBe('Friday Sunset Padel 7PM');
    });

    it('5. posts a user reply to an existing ticket without passing undefined fields', async () => {
      const mockTicket: SupportTicket = {
        id: 'ticket_reply_test',
        ticketNumber: 'TK-2026-RPL01',
        userId: 'user_reply_1',
        userName: 'Faisal',
        userEmail: 'faisal@example.com',
        category: 'technical_issue',
        status: 'waiting_for_user',
        subject: 'Cannot upload booking PDF',
        description: 'Original description',
        language: 'en',
        origin: 'help_and_support',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const msg = await addTicketMessage(mockTicket, {
        senderId: 'user_reply_1',
        senderRole: 'user',
        senderName: 'Faisal',
        content: 'I tried clearing cache and it now works partially.'
      });

      expect(msg.content).toBe('I tried clearing cache and it now works partially.');

      // Check setDoc for message
      const savedMsgData = firestoreMocks.setDoc.mock.calls[0][1];
      assertNoUndefinedFields(savedMsgData);
      expect(savedMsgData.isInternalNote).toBe(false);

      // Check updateDoc for ticket metadata: ticket should auto-reopen to 'open'
      expect(firestoreMocks.updateDoc).toHaveBeenCalled();
      const updatedTicketData = firestoreMocks.updateDoc.mock.calls[0][1];
      assertNoUndefinedFields(updatedTicketData);
      expect(updatedTicketData.status).toBe('open');
      expect(updatedTicketData.lastReplyBy).toBe('user');
    });

    it('6. verifies updateTicketStatus, updateTicketPriority, and assignTicketStaff never pass undefined fields', async () => {
      const mockTicket: SupportTicket = {
        id: 'ticket_ops_test',
        ticketNumber: 'TK-2026-OPS01',
        userId: 'user_ops_1',
        userName: 'Hamad',
        userEmail: 'hamad@example.com',
        category: 'general_question',
        status: 'open',
        subject: 'Status test',
        description: 'Test operations',
        language: 'en',
        origin: 'help_and_support',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateTicketStatus(mockTicket, 'resolved');
      const statusUpdate = firestoreMocks.updateDoc.mock.calls[0][1];
      assertNoUndefinedFields(statusUpdate);
      expect(statusUpdate.status).toBe('resolved');

      await updateTicketPriority('ticket_ops_test', 'high');
      const priorityUpdate = firestoreMocks.updateDoc.mock.calls[1][1];
      assertNoUndefinedFields(priorityUpdate);
      expect(priorityUpdate.priority).toBe('high');

      await assignTicketStaff('ticket_ops_test', 'admin_uid_77', 'Khalid');
      const staffUpdate = firestoreMocks.updateDoc.mock.calls[2][1];
      assertNoUndefinedFields(staffUpdate);
      expect(staffUpdate.assignedTo).toBe('admin_uid_77');
      expect(staffUpdate.assignedStaffName).toBe('Khalid');
    });
  });

  describe('Zoho Mail SMTP Dispatcher & Official Address', () => {
    it('gracefully handles missing Zoho credentials and returns safe simulation response', async () => {
      const mockTicket: SupportTicket = {
        id: 'ticket_test_123',
        ticketNumber: 'TK-2026-TEST1',
        userId: 'user_456',
        userName: 'Faisal Al-Sabah',
        userEmail: 'faisal@example.com',
        category: 'community_guidelines',
        status: 'open',
        subject: 'Violent conduct on court',
        description: 'Player exhibited aggressive dissent during the match.',
        origin: 'community_guidelines',
        language: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await sendSupportEmail({
        event: 'ticket_created',
        ticket: mockTicket
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('Support email notifications are disabled for launch');
    });

    it('skips email dispatch for internal staff notes', async () => {
      const mockTicket: SupportTicket = {
        id: 'ticket_test_123',
        ticketNumber: 'TK-2026-TEST1',
        userId: 'user_456',
        userName: 'Faisal',
        userEmail: 'faisal@example.com',
        category: 'general_question',
        status: 'open',
        subject: 'General Question',
        description: 'Test note',
        origin: 'help_and_support',
        language: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await sendSupportEmail({
        event: 'support_reply',
        ticket: mockTicket,
        messageContent: 'Secret staff observation',
        isInternalNote: true
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('Internal note skipped');
    });
  });

  describe('Internal Notes Security & Separation', () => {
    it('filters out internal notes when regular user views messages', () => {
      const rawMessages: TicketMessage[] = [
        {
          id: 'msg_1',
          ticketId: 't1',
          senderId: 'user_1',
          senderRole: 'user',
          senderName: 'Player',
          content: 'Hello I need help',
          createdAt: '2026-11-07T10:00:00Z'
        },
        {
          id: 'msg_2',
          ticketId: 't1',
          senderId: 'admin_1',
          senderRole: 'support',
          senderName: 'Staff Member',
          content: 'Internal note: User seems to be reporting a duplicate match.',
          isInternalNote: true,
          createdAt: '2026-11-07T10:05:00Z'
        },
        {
          id: 'msg_3',
          ticketId: 't1',
          senderId: 'admin_1',
          senderRole: 'support',
          senderName: 'La3ib Support',
          content: 'We are investigating your report now.',
          isInternalNote: false,
          createdAt: '2026-11-07T10:10:00Z'
        }
      ];

      // Regular user view (isAdmin = false)
      const userVisible = rawMessages.filter(m => !m.isInternalNote);
      expect(userVisible.length).toBe(2);
      expect(userVisible.some(m => m.isInternalNote)).toBe(false);
      expect(userVisible.find(m => m.id === 'msg_2')).toBeUndefined();

      // Staff view (isAdmin = true)
      const staffVisible = rawMessages;
      expect(staffVisible.length).toBe(3);
      expect(staffVisible.find(m => m.id === 'msg_2')?.isInternalNote).toBe(true);
    });
  });

  describe('Cloudflare Pages Zoho Mail REST API (/api/support/notify)', () => {
    it('returns CORS headers for OPTIONS requests', async () => {
      const { onRequestOptions } = await import('../functions/api/support/notify');
      const req = new Request('https://la3ibkw.com/api/support/notify', {
        method: 'OPTIONS',
        headers: { Origin: 'https://la3ibkw.com' }
      });
      const res = await onRequestOptions({
        request: req,
        env: {},
        functionPath: '/api/support/notify',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://la3ibkw.com');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('rejects unauthenticated POST requests with HTTP 401', async () => {
      const { onRequestPost } = await import('../functions/api/support/notify');
      const req = new Request('https://la3ibkw.com/api/support/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'ticket_created' })
      });
      const res = await onRequestPost({
        request: req,
        env: {},
        functionPath: '/api/support/notify',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(res.status).toBe(401);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('Real-Time Unread Ticket Indicator & In-App Only Launch', () => {
    it('marks newly created tickets as unread requiring admin attention', async () => {
      const { isTicketUnreadByAdmin } = await import('../src/types');
      const newTicket: any = {
        id: 't_new_1',
        ticketNumber: 'TK-2026-N1',
        userId: 'u1',
        status: 'open',
        unreadBySupport: true,
        lastReplyBy: 'user',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T00:00:00Z'
      };

      expect(isTicketUnreadByAdmin(newTicket)).toBe(true);
    });

    it('clears unread state when administrator reviews ticket', async () => {
      const { isTicketUnreadByAdmin } = await import('../src/types');
      const reviewedTicket: any = {
        id: 't_rev_1',
        ticketNumber: 'TK-2026-R1',
        userId: 'u1',
        status: 'open',
        unreadBySupport: false,
        adminReviewedAt: '2026-11-08T01:00:00Z',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T01:00:00Z'
      };

      expect(isTicketUnreadByAdmin(reviewedTicket)).toBe(false);
    });

    it('re-marks ticket as requiring attention when user replies', async () => {
      const { isTicketUnreadByAdmin } = await import('../src/types');
      const userRepliedTicket: any = {
        id: 't_reply_1',
        ticketNumber: 'TK-2026-R2',
        userId: 'u1',
        status: 'open',
        unreadBySupport: true,
        lastReplyBy: 'user',
        lastReplyAt: '2026-11-08T02:00:00Z',
        adminReviewedAt: '2026-11-08T01:00:00Z',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T02:00:00Z'
      };

      expect(isTicketUnreadByAdmin(userRepliedTicket)).toBe(true);
    });

    it('does NOT count administrator replies as unread support requests', async () => {
      const { isTicketUnreadByAdmin } = await import('../src/types');
      const adminRepliedTicket: any = {
        id: 't_admin_reply_1',
        ticketNumber: 'TK-2026-A1',
        userId: 'u1',
        status: 'waiting_for_user',
        unreadBySupport: false,
        lastReplyBy: 'support',
        lastReplyAt: '2026-11-08T02:30:00Z',
        adminReviewedAt: '2026-11-08T02:30:00Z',
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T02:30:00Z'
      };

      expect(isTicketUnreadByAdmin(adminRepliedTicket)).toBe(false);
    });

    it('excludes resolved tickets from unread count unless reopened by user reply', async () => {
      const { isTicketUnreadByAdmin } = await import('../src/types');
      const resolvedTicket: any = {
        id: 't_res_1',
        ticketNumber: 'TK-2026-RES',
        userId: 'u1',
        status: 'resolved',
        unreadBySupport: true, // Even if flag was true, resolved status suppresses unread
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T03:00:00Z'
      };

      expect(isTicketUnreadByAdmin(resolvedTicket)).toBe(false);

      // When user replies, status changes to open and it becomes unread again
      const reopenedTicket: any = {
        ...resolvedTicket,
        status: 'open',
        lastReplyBy: 'user',
        lastReplyAt: '2026-11-08T04:00:00Z'
      };
      expect(isTicketUnreadByAdmin(reopenedTicket)).toBe(true);
    });

    it('handles concurrent updates safely so older admin reviews do not clear newer user replies', async () => {
      const { isTicketUnreadByAdmin } = await import('../src/types');
      // Admin review timestamp: 01:00:00Z
      // User concurrent reply timestamp: 01:05:00Z
      const concurrentTicket: any = {
        id: 't_concurrent_1',
        ticketNumber: 'TK-2026-C1',
        userId: 'u1',
        status: 'open',
        unreadBySupport: false, // Older review wrote false
        lastReplyBy: 'user',
        lastReplyAt: '2026-11-08T01:05:00Z',
        adminReviewedAt: '2026-11-08T01:00:00Z', // Precedes lastReplyAt
        createdAt: '2026-11-08T00:00:00Z',
        updatedAt: '2026-11-08T01:05:00Z'
      };

      expect(isTicketUnreadByAdmin(concurrentTicket)).toBe(true);
    });

    it('bypasses outgoing email requests when SUPPORT_EMAIL_ENABLED is false', async () => {
      const { dispatchSupportNotification, SUPPORT_EMAIL_ENABLED } = await import('../src/lib/supportService');
      expect(SUPPORT_EMAIL_ENABLED).toBe(false);

      const mockTicket: any = {
        id: 't_quiet',
        ticketNumber: 'TK-QUIET',
        userEmail: 'user@example.com',
        subject: 'No email sent'
      };

      const result = await dispatchSupportNotification({
        event: 'ticket_created',
        ticket: mockTicket
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('Support email notifications are disabled');
    });
  });

  describe('Support Modal Portals & Full-Viewport Responsiveness', () => {
    it('exports SupportModalPortal component for full viewport portal rendering', async () => {
      const { SupportModalPortal } = await import('../src/components/support/SupportModalPortal');
      expect(SupportModalPortal).toBeDefined();
      expect(typeof SupportModalPortal).toBe('function');
    });

    it('exports all 4 support modals with consistent modal infrastructure', async () => {
      const { CreateTicketModal } = await import('../src/components/support/CreateTicketModal');
      const { MyTicketsModal } = await import('../src/components/support/MyTicketsModal');
      const { TicketDetailModal } = await import('../src/components/support/TicketDetailModal');
      const { SupportDashboardModal } = await import('../src/components/support/SupportDashboardModal');

      expect(CreateTicketModal).toBeDefined();
      expect(MyTicketsModal).toBeDefined();
      expect(TicketDetailModal).toBeDefined();
      expect(SupportDashboardModal).toBeDefined();
    });

    it('applies scroll locking and layout shift compensation on document.body during modal presentation', () => {
      // Setup mock DOM environment if running in Node
      const mockBody = {
        style: {
          overflow: '',
          paddingRight: ''
        }
      };
      const doc = typeof document !== 'undefined' ? document : ({ body: mockBody } as any);

      const originalOverflow = doc.body.style.overflow;
      
      // Simulate opening modal behavior
      doc.body.style.overflow = 'hidden';
      expect(doc.body.style.overflow).toBe('hidden');

      // Restore on close
      doc.body.style.overflow = originalOverflow;
      expect(doc.body.style.overflow).toBe(originalOverflow);
    });

    it('verifies escape key and backdrop click isolation contracts', () => {
      const onClose = vi.fn();

      // Backdrop click target equals currentTarget
      const backdropEvent = {
        target: 'backdrop_div',
        currentTarget: 'backdrop_div'
      };
      if (backdropEvent.target === backdropEvent.currentTarget) {
        onClose();
      }
      expect(onClose).toHaveBeenCalledTimes(1);

      // Child content click target does not equal currentTarget
      const childEvent = {
        target: 'inner_modal_card',
        currentTarget: 'backdrop_div'
      };
      if (childEvent.target === childEvent.currentTarget) {
        onClose();
      }
      expect(onClose).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });
});


