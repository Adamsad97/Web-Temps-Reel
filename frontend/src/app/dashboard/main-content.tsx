'use client';

import { Message, GroupMessage, DiscussionGroup, DiscussionGroupMessage } from '@/types';
import NewsFeed from '@/components/NewsFeed';
import PrivateChat from '@/components/PrivateChat';
import GroupChat from '@/components/GroupChat';
import DiscussionGroups from '@/components/DiscussionGroups';
import { Tab } from './constants';
import { NewsItem, Contact } from '@/types';

interface MainContentProps {
  activeTab: Tab;
  isStaff: boolean;
  newsItems: NewsItem[];
  selectedContact: Contact | null;
  latestPrivateMessage?: (Message & { fromName?: string; fromRole?: string });
  typingFrom?: string;
  latestGroupMessage?: GroupMessage;
  groupTypingNames: string[];
  discussionGroups: DiscussionGroup[];
  latestDiscussionEvent?: { type: string; payload: Record<string, unknown> };
  onSendPrivateMessage: (contactId: string, content: string) => void;
  onTypingPrivate: (contactId: string) => void;
  onStopTypingPrivate: (contactId: string) => void;
  onSendGroupMessage: (content: string) => void;
  onGroupTyping: () => void;
  onGroupStopTyping: () => void;
  onSendEvent: (type: string, payload: Record<string, unknown>) => void;
  onGroupsChange: (updater: DiscussionGroup[] | ((prev: DiscussionGroup[]) => DiscussionGroup[])) => void;
}

export default function MainContent({
  activeTab,
  isStaff,
  newsItems,
  selectedContact,
  latestPrivateMessage,
  typingFrom,
  latestGroupMessage,
  groupTypingNames,
  discussionGroups,
  latestDiscussionEvent,
  onSendPrivateMessage,
  onTypingPrivate,
  onStopTypingPrivate,
  onSendGroupMessage,
  onGroupTyping,
  onGroupStopTyping,
  onSendEvent,
  onGroupsChange,
}: MainContentProps) {
  return (
    <main className="dashboard-main" style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      {activeTab==='news' && <NewsFeed news={newsItems}/>}
      {activeTab==='messages' && (
        selectedContact
          ? <PrivateChat key={selectedContact.id} contact={selectedContact}
              onSend={(contactId, messageContent) => onSendPrivateMessage(contactId, messageContent)}
              onTyping={contactId => onTypingPrivate(contactId)}
              onStopTyping={contactId => onStopTypingPrivate(contactId)}
              newMessage={latestPrivateMessage}
              typingFrom={typingFrom}
            />
          : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>Sélectionnez un contact</div>
      )}
      {activeTab==='group' && isStaff && <GroupChat onSendMessage={onSendGroupMessage} onStartTyping={onGroupTyping} onStopTyping={onGroupStopTyping} latestIncomingMessage={latestGroupMessage} currentlyTypingNames={groupTypingNames}/>}
      {activeTab==='discussions' && isStaff && (
        <DiscussionGroups
          groups={discussionGroups}
          onGroupsChange={onGroupsChange}
          onSend={onSendEvent}
          latestRealtimeEvent={latestDiscussionEvent}
        />
      )}
    </main>
  );
}
