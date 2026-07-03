import {
  Bell,
  Calendar,
  Church,
  DollarSign,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';

const commonActions = (isMobile) => [
  {
    id: 'prayer',
    label: 'Prayer Requests',
    icon: Heart,
    color: 'bg-red-50 text-red-600',
    description: 'Submit and review prayer requests',
    path: isMobile ? '/mobile/prayer' : '/prayer',
  },
  {
    id: 'giving',
    label: 'Give Online',
    icon: DollarSign,
    color: 'bg-green-50 text-green-600',
    description: 'Record and review giving',
    path: isMobile ? '/mobile/giving' : '/giving',
  },
  {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    color: 'bg-blue-50 text-blue-600',
    description: 'Browse church events',
    path: isMobile ? '/mobile/events' : '/events',
  },
  {
    id: 'chat',
    label: 'Church Chat',
    icon: MessageCircle,
    color: 'bg-purple-50 text-purple-600',
    description: 'Join church conversations',
    path: isMobile ? '/mobile/chat' : '/chat',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Bell,
    color: 'bg-amber-50 text-amber-600',
    description: 'View church announcements',
    path: '/announcements',
  },
  {
    id: 'attendance-history',
    label: 'Attendance',
    icon: ShieldCheck,
    color: 'bg-cyan-50 text-cyan-600',
    description: 'Review attendance history and summaries',
    path: '/attendance/history',
  },
];

export const getDashboardActions = ({ role, isMobile = false }) => {
  const actions = [...commonActions(isMobile)];

  if (role === 'member') {
    actions.push({
      id: 'cell-change',
      label: 'Change Cell',
      icon: Home,
      color: 'bg-indigo-50 text-indigo-600',
      description: 'Request a move to another cell',
      path: '/member/cell-change',
    });
  }

  if (role === 'usher') {
    actions.push({
      id: 'checkin',
      label: 'Sunday Check-in',
      icon: UserCheck,
      color: 'bg-cyan-50 text-cyan-600',
      description: 'Record Sunday attendance',
      path: '/checkin',
    });
  }

  if (role === 'cell_leader') {
    actions.push(
      {
        id: 'cell-dashboard',
        label: 'My Cell',
        icon: Users,
        color: 'bg-indigo-50 text-indigo-600',
        description: 'Open cell dashboard',
        path: '/cell/dashboard',
      },
      {
        id: 'cell-attendance',
        label: 'Cell Attendance',
        icon: UserCheck,
        color: 'bg-teal-50 text-teal-600',
        description: 'Record weekly cell attendance',
        path: '/cell/attendance',
      },
      {
        id: 'cell-requests',
        label: 'Cell Requests',
        icon: Bell,
        color: 'bg-orange-50 text-orange-600',
        description: 'Review member cell change requests',
        path: '/leadership/cell-change-requests',
      },
    );
  }

  if (role === 'zone_leader') {
    actions.push(
      {
        id: 'zone-dashboard',
        label: 'My Zone',
        icon: MapPin,
        color: 'bg-indigo-50 text-indigo-600',
        description: 'Open zone dashboard',
        path: '/zone/dashboard',
      },
      {
        id: 'zone-members',
        label: 'Zone Members',
        icon: Users,
        color: 'bg-teal-50 text-teal-600',
        description: 'Review members in your zone',
        path: '/zone/members',
      },
      {
        id: 'zone-cells',
        label: 'Zone Cells',
        icon: Home,
        color: 'bg-emerald-50 text-emerald-600',
        description: 'Manage cells in your zone',
        path: '/zone/cells',
      },
      {
        id: 'cell-requests',
        label: 'Cell Requests',
        icon: Bell,
        color: 'bg-orange-50 text-orange-600',
        description: 'Review member cell change requests',
        path: '/leadership/cell-change-requests',
      },
    );
  }

  if (['admin', 'superadmin'].includes(role)) {
    actions.push(
      {
        id: 'admin-dashboard',
        label: 'Admin Dashboard',
        icon: Shield,
        color: 'bg-indigo-50 text-indigo-600',
        description: 'Open system administration',
        path: '/admin-dashboard',
      },
      {
        id: 'contact-inbox',
        label: 'Contact Inbox',
        icon: MessageCircle,
        color: 'bg-blue-50 text-blue-600',
        description: 'Respond to website contact form messages',
        path: '/admin/contact-messages',
      },
      {
        id: 'members',
        label: 'Manage Members',
        icon: Users,
        color: 'bg-teal-50 text-teal-600',
        description: 'Review and manage members',
        path: '/members',
      },
      {
        id: 'zones',
        label: 'Manage Zones',
        icon: MapPin,
        color: 'bg-emerald-50 text-emerald-600',
        description: 'Manage church zones',
        path: '/pastor/zones',
      },
      {
        id: 'cell-requests',
        label: 'Cell Requests',
        icon: Bell,
        color: 'bg-orange-50 text-orange-600',
        description: 'Review member cell change requests',
        path: '/leadership/cell-change-requests',
      },
    );
  }

  if (['pastor', 'elder'].includes(role)) {
    actions.push(
      {
        id: 'pastor-dashboard',
        label: 'Pastor Dashboard',
        icon: Church,
        color: 'bg-indigo-50 text-indigo-600',
        description: 'Open executive dashboard',
        path: '/pastor-dashboard',
      },
      {
        id: 'contact-inbox',
        label: 'Contact Inbox',
        icon: MessageCircle,
        color: 'bg-blue-50 text-blue-600',
        description: 'Reply to contact form messages',
        path: '/admin/contact-messages',
      },
      {
        id: 'members',
        label: 'Members',
        icon: Users,
        color: 'bg-teal-50 text-teal-600',
        description: 'Review church members',
        path: '/members',
      },
      {
        id: 'assignments',
        label: 'Assignments',
        icon: UserCheck,
        color: 'bg-emerald-50 text-emerald-600',
        description: 'Manage leadership assignments',
        path: '/pastor/assignments',
      },
    );
  }

  return actions;
};
