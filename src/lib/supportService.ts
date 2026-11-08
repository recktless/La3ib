import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  type Unsubscribe 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { 
  SupportTicket, 
  TicketMessage, 
  SupportTicketCategory, 
  SupportTicketStatus, 
  SupportTicketPriority, 
  SupportTicketOrigin,
  SupportTicketAttachment,
  normalizeTicketStatus
} from '../types';

export interface CreateTicketInput {
  userId: string;
  userName: string;
  userEmail: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  subject: string;
  description: string;
  origin?: SupportTicketOrigin;
  relatedPlayerId?: string;
  relatedPlayerName?: string;
  relatedGameId?: string;
  relatedGameTitle?: string;
  attachments?: SupportTicketAttachment[];
  language?: 'en' | 'ar';
}

/**
 * Generates a human-friendly collision-safe ticket number: TK-YYYY-XXXXX
 */
export function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TK-${year}-${randomChars}`;
}

/**
 * Backend configuration flag for support email notifications.
 * Disabled by default for launch (in-app only support).
 */
export const SUPPORT_EMAIL_ENABLED: boolean = (
  typeof process !== 'undefined' && process.env?.SUPPORT_EMAIL_ENABLED === 'true'
) || (
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPPORT_EMAIL_ENABLED === 'true'
) || false;

/**
 * Sends transactional email notifications via backend Zoho Mail endpoint.
 * Non-blocking: returns gracefully even if offline, unconfigured, or disabled.
 */
export async function dispatchSupportNotification(payload: {
  event: 'ticket_created' | 'support_reply' | 'user_reply' | 'ticket_resolved';
  ticket: SupportTicket;
  messageContent?: string;
  senderName?: string;
  isInternalNote?: boolean;
}): Promise<{ success: boolean; emailSent?: boolean; message?: string }> {
  // If email notifications are disabled for launch, bypass without network requests
  if (!SUPPORT_EMAIL_ENABLED) {
    return {
      success: true,
      emailSent: false,
      message: 'Support email notifications are disabled for launch (in-app only).'
    };
  }

  // Never send emails for internal staff notes
  if (payload.isInternalNote) {
    return { success: true, emailSent: false, message: 'Internal note skipped from email notification.' };
  }

  try {
    const token = await auth?.currentUser?.getIdToken().catch(() => null);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/support/notify', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('[Support Email Dispatch] Notification response not ok:', errData);
      return { success: false, emailSent: false, message: errData.error || 'Server rejected email.' };
    }

    const data = await res.json().catch(() => ({ success: true, emailSent: true }));
    return data;
  } catch (err: any) {
    console.warn('[Support Email Dispatch] Notification skipped or offline:', err?.message || err);
    return { success: false, emailSent: false, message: err?.message };
  }
}

/**
 * Recursively strips properties whose value is `undefined`.
 * Preserves false, 0, empty strings, and empty arrays.
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => 
      item !== null && typeof item === 'object' && !(item instanceof Date)
        ? removeUndefinedFields(item)
        : item
    ) as unknown as T;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = removeUndefinedFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Creates a new support ticket in Firestore and triggers initial notifications.
 */
export async function createSupportTicket(input: CreateTicketInput): Promise<SupportTicket> {
  if (!db) {
    throw new Error('Database connection is not initialized. Please sign in or check connectivity.');
  }

  const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ticketNumber = generateTicketNumber();
  const nowISO = new Date().toISOString();

  // If category is Community Guidelines Violation, default priority is 'high'
  const calculatedPriority: SupportTicketPriority = input.priority || (
    input.category === 'community_guidelines' ? 'high' : 'normal'
  );

  // Construct document with required fields only
  const ticketData: Record<string, any> = {
    id: ticketId,
    ticketNumber,
    userId: input.userId,
    userName: input.userName?.trim() || 'Athlete',
    userEmail: input.userEmail.trim(),
    category: input.category,
    priority: calculatedPriority,
    status: 'open',
    subject: input.subject.trim(),
    description: input.description.trim(),
    origin: input.origin || 'help_and_support',
    attachments: (input.attachments || []).map(att => ({
      id: att.id,
      name: att.name,
      url: att.url,
      size: att.size,
      type: att.type
    })),
    language: input.language === 'ar' ? 'ar' : 'en',
    createdAt: nowISO,
    updatedAt: nowISO,
    lastReplyAt: nowISO,
    lastReplyBy: 'user',
    unreadByUser: false,
    unreadBySupport: true
  };

  // Only assign optional fields if they have a non-empty string value
  const trimmedPlayerId = input.relatedPlayerId?.trim();
  if (trimmedPlayerId) {
    ticketData.relatedPlayerId = trimmedPlayerId;
  }
  const trimmedPlayerName = input.relatedPlayerName?.trim();
  if (trimmedPlayerName) {
    ticketData.relatedPlayerName = trimmedPlayerName;
  }
  const trimmedGameId = input.relatedGameId?.trim();
  if (trimmedGameId) {
    ticketData.relatedGameId = trimmedGameId;
  }
  const trimmedGameTitle = input.relatedGameTitle?.trim();
  if (trimmedGameTitle) {
    ticketData.relatedGameTitle = trimmedGameTitle;
  }

  // Sanitize with removeUndefinedFields as defense-in-depth
  const cleanTicket = removeUndefinedFields(ticketData) as SupportTicket;

  const docRef = doc(db, 'supportTickets', ticketId);
  try {
    await setDoc(docRef, cleanTicket);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `supportTickets/${ticketId}`);
  }

  // Also record initial description as the first message in the subcollection
  const initialMessageId = `msg_${Date.now()}_0`;
  const initialMessageData: Record<string, any> = {
    id: initialMessageId,
    ticketId,
    senderId: input.userId,
    senderRole: 'user',
    senderName: input.userName?.trim() || 'Athlete',
    content: input.description.trim(),
    attachments: (input.attachments || []).map(att => ({
      id: att.id,
      name: att.name,
      url: att.url,
      size: att.size,
      type: att.type
    })),
    isInternalNote: false,
    createdAt: nowISO
  };

  const cleanInitialMessage = removeUndefinedFields(initialMessageData) as TicketMessage;

  try {
    const msgRef = doc(db, 'supportTickets', ticketId, 'messages', initialMessageId);
    await setDoc(msgRef, cleanInitialMessage);
  } catch (err) {
    console.warn('[SupportService] Initial message subcollection notice:', err);
  }

  // Fire email notifications in background
  dispatchSupportNotification({
    event: 'ticket_created',
    ticket: cleanTicket,
    senderName: input.userName
  }).catch((err) => console.warn('[SupportService] Email dispatch notice:', err));

  return cleanTicket;
}

/**
 * Subscribes to the authenticated user's tickets in real time.
 */
export function subscribeUserTickets(
  userId: string,
  callback: (tickets: SupportTicket[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db || !userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'supportTickets'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const tickets: SupportTicket[] = [];
      snap.forEach((d) => {
        const raw = d.data() as any;
        tickets.push({
          id: d.id,
          ...raw,
          status: normalizeTicketStatus(raw.status)
        } as SupportTicket);
      });
      callback(tickets);
    },
    (err) => {
      console.warn('[SupportService] User tickets subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * Subscribes to all support tickets for authorized staff dashboard in real time.
 */
export function subscribeAllTickets(
  callback: (tickets: SupportTicket[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'supportTickets'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const tickets: SupportTicket[] = [];
      snap.forEach((d) => {
        const raw = d.data() as any;
        tickets.push({
          id: d.id,
          ...raw,
          status: normalizeTicketStatus(raw.status)
        } as SupportTicket);
      });
      callback(tickets);
    },
    (err) => {
      console.warn('[SupportService] All tickets staff subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * Subscribes to the messages subcollection of a specific support ticket.
 * Enforces client-side filtering as defense-in-depth against internal notes leaking to regular users.
 */
export function subscribeTicketMessages(
  ticketId: string,
  isAdmin: boolean,
  callback: (messages: TicketMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db || !ticketId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'supportTickets', ticketId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs: TicketMessage[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() } as TicketMessage;
        // Non-admin users must NEVER see internal staff notes
        if (!isAdmin && item.isInternalNote) {
          return;
        }
        msgs.push(item);
      });
      callback(msgs);
    },
    (err) => {
      console.warn('[SupportService] Ticket messages subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * Posts a reply or staff internal note to a support ticket.
 */
export async function addTicketMessage(
  ticket: SupportTicket,
  params: {
    senderId: string;
    senderRole: 'user' | 'support';
    senderName: string;
    content: string;
    attachments?: SupportTicketAttachment[];
    isInternalNote?: boolean;
    targetStatus?: SupportTicketStatus;
  }
): Promise<TicketMessage> {
  if (!db) {
    throw new Error('Database is not initialized.');
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowISO = new Date().toISOString();
  const isInternal = Boolean(params.isInternalNote && params.senderRole === 'support');

  const newMsgData: Record<string, any> = {
    id: messageId,
    ticketId: ticket.id,
    senderId: params.senderId,
    senderRole: params.senderRole,
    senderName: params.senderName,
    content: params.content.trim(),
    attachments: (params.attachments || []).map(att => ({
      id: att.id,
      name: att.name,
      url: att.url,
      size: att.size,
      type: att.type
    })),
    isInternalNote: isInternal,
    createdAt: nowISO
  };

  const cleanMsg = removeUndefinedFields(newMsgData) as TicketMessage;

  const msgRef = doc(db, 'supportTickets', ticket.id, 'messages', messageId);
  try {
    await setDoc(msgRef, cleanMsg);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `supportTickets/${ticket.id}/messages/${messageId}`);
  }

  // Update parent ticket metadata
  const ticketRef = doc(db, 'supportTickets', ticket.id);
  const ticketUpdates: Record<string, any> = {
    updatedAt: nowISO
  };

  if (!isInternal) {
    ticketUpdates.lastReplyAt = nowISO;
    ticketUpdates.lastReplyBy = params.senderRole;

    if (params.senderRole === 'support') {
      ticketUpdates.unreadByUser = true;
      ticketUpdates.unreadBySupport = false;
      ticketUpdates.adminReviewedAt = nowISO;
      // Default transition when staff replies: waiting for user unless specified
      ticketUpdates.status = params.targetStatus || 'waiting_for_user';
    } else {
      ticketUpdates.unreadByUser = false;
      ticketUpdates.unreadBySupport = true;
      // If user replies and ticket was waiting for user or resolved, re-open to open
      if (ticket.status === 'waiting_for_user' || ticket.status === 'resolved') {
        ticketUpdates.status = 'open';
      }
    }
  }

  if (params.targetStatus && params.targetStatus !== ticket.status) {
    ticketUpdates.status = params.targetStatus;
  }

  const cleanUpdates = removeUndefinedFields(ticketUpdates);

  try {
    if (Object.keys(cleanUpdates).length > 0) {
      await updateDoc(ticketRef, cleanUpdates);
    }
  } catch (err) {
    console.warn('[SupportService] Notice updating ticket lastReply metadata:', err);
  }

  // Dispatch email notification if not an internal note
  if (!isInternal) {
    const event = params.senderRole === 'support' ? 'support_reply' : 'user_reply';
    dispatchSupportNotification({
      event,
      ticket: { ...ticket, ...cleanUpdates },
      messageContent: params.content.trim(),
      senderName: params.senderName
    }).catch((err) => console.warn('[SupportService] Reply notification email notice:', err));
  }

  return cleanMsg;
}

/**
 * Updates the status of a ticket.
 */
export async function updateTicketStatus(
  ticket: SupportTicket,
  newStatus: SupportTicketStatus
): Promise<void> {
  if (!db) throw new Error('Database is not initialized.');

  const nowISO = new Date().toISOString();
  const ticketRef = doc(db, 'supportTickets', ticket.id);

  try {
    const cleanUpdate = removeUndefinedFields({
      status: newStatus,
      updatedAt: nowISO,
      ...(newStatus === 'resolved' ? { unreadBySupport: false } : {})
    });
    await updateDoc(ticketRef, cleanUpdate);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${ticket.id}`);
  }

  // If status is resolved, trigger email notification to user
  if (newStatus === 'resolved') {
    dispatchSupportNotification({
      event: 'ticket_resolved',
      ticket: { ...ticket, status: newStatus, updatedAt: nowISO }
    }).catch((err) => console.warn('[SupportService] Resolved email notice:', err));
  }
}

/**
 * Updates priority (staff only).
 */
export async function updateTicketPriority(
  ticketId: string,
  newPriority: SupportTicketPriority
): Promise<void> {
  if (!db) throw new Error('Database is not initialized.');
  const ticketRef = doc(db, 'supportTickets', ticketId);

  try {
    const cleanUpdate = removeUndefinedFields({
      priority: newPriority,
      updatedAt: new Date().toISOString()
    });
    await updateDoc(ticketRef, cleanUpdate);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${ticketId}`);
  }
}

/**
 * Assigns staff member to ticket (staff only).
 */
export async function assignTicketStaff(
  ticketId: string,
  staffUid: string,
  staffName: string
): Promise<void> {
  if (!db) throw new Error('Database is not initialized.');
  const ticketRef = doc(db, 'supportTickets', ticketId);

  try {
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (staffUid && staffUid.trim()) updateData.assignedTo = staffUid.trim();
    if (staffName && staffName.trim()) updateData.assignedStaffName = staffName.trim();
    const cleanUpdate = removeUndefinedFields(updateData);
    await updateDoc(ticketRef, cleanUpdate);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${ticketId}`);
  }
}

/**
 * Marks ticket as read for the user or support staff.
 */
export async function markTicketAsRead(
  ticketId: string,
  role: 'user' | 'support',
  reviewedAt?: string
): Promise<void> {
  if (!db) return;
  const ticketRef = doc(db, 'supportTickets', ticketId);

  try {
    const update = role === 'user' 
      ? { unreadByUser: false } 
      : { unreadBySupport: false, adminReviewedAt: reviewedAt || new Date().toISOString() };
    await updateDoc(ticketRef, removeUndefinedFields(update));
  } catch (err) {
    // Non-critical background update
  }
}
