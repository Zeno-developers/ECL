import React from 'react';
import { 
  Church, 
  Users, 
  Calendar, 
  HeartHandshake, 
  DollarSign, 
  User,
  Home,
  Prayer,
  BookOpen,
  Settings,
  Bell,
  LogOut,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Check,
  X,
  Menu,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Lock,
  Mail,
  Phone,
  MapPin,
  Clock,
  Video,
  Music,
  Mic2,
  Book,
  GraduationCap,
  HandHeart,
  Sprout
} from 'lucide-react';

// Main App Icon Component
export const AppIcon = ({ size = 24, color = "#2d1b69", className = "" }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <Church size={size} color={color} />
    <div 
      className="absolute -top-1 -right-1 bg-purple-600 rounded-full flex items-center justify-center"
      style={{ 
        width: size * 0.4, 
        height: size * 0.4,
        border: '2px solid white'
      }}
    >
      <div 
        className="bg-white rounded-sm"
        style={{
          width: size * 0.15,
          height: size * 0.15
        }}
      />
    </div>
  </div>
);

// Navigation Icons
export const DashboardIcon = ({ size = 24, color = "currentColor" }) => (
  <Home size={size} color={color} />
);

export const PrayerIcon = ({ size = 24, color = "currentColor" }) => (
  <Prayer size={size} color={color} />
);

export const GivingIcon = ({ size = 24, color = "currentColor" }) => (
  <DollarSign size={size} color={color} />
);

export const EventsIcon = ({ size = 24, color = "currentColor" }) => (
  <Calendar size={size} color={color} />
);

export const ProfileIcon = ({ size = 24, color = "currentColor" }) => (
  <User size={size} color={color} />
);

export const MembersIcon = ({ size = 24, color = "currentColor" }) => (
  <Users size={size} color={color} />
);

export const SermonsIcon = ({ size = 24, color = "currentColor" }) => (
  <Video size={size} color={color} />
);

export const MinistriesIcon = ({ size = 24, color = "currentColor" }) => (
  <HeartHandshake size={size} color={color} />
);

export const ResourcesIcon = ({ size = 24, color = "currentColor" }) => (
  <BookOpen size={size} color={color} />
);

export const SettingsIcon = ({ size = 24, color = "currentColor" }) => (
  <Settings size={size} color={color} />
);

// Action Icons
export const NotificationIcon = ({ size = 24, color = "currentColor" }) => (
  <Bell size={size} color={color} />
);

export const LogoutIcon = ({ size = 24, color = "currentColor" }) => (
  <LogOut size={size} color={color} />
);

export const AddIcon = ({ size = 24, color = "currentColor" }) => (
  <Plus size={size} color={color} />
);

export const SearchIcon = ({ size = 24, color = "currentColor" }) => (
  <Search size={size} color={color} />
);

export const FilterIcon = ({ size = 24, color = "currentColor" }) => (
  <Filter size={size} color={color} />
);

export const DownloadIcon = ({ size = 24, color = "currentColor" }) => (
  <Download size={size} color={color} />
);

export const UploadIcon = ({ size = 24, color = "currentColor" }) => (
  <Upload size={size} color={color} />
);

export const EditIcon = ({ size = 24, color = "currentColor" }) => (
  <Edit size={size} color={color} />
);

export const DeleteIcon = ({ size = 24, color = "currentColor" }) => (
  <Trash2 size={size} color={color} />
);

export const CheckIcon = ({ size = 24, color = "currentColor" }) => (
  <Check size={size} color={color} />
);

export const CloseIcon = ({ size = 24, color = "currentColor" }) => (
  <X size={size} color={color} />
);

export const ViewIcon = ({ size = 24, color = "currentColor" }) => (
  <Eye size={size} color={color} />
);

export const LockIcon = ({ size = 24, color = "currentColor" }) => (
  <Lock size={size} color={color} />
);

// Ministry Specific Icons
export const WorshipIcon = ({ size = 24, color = "currentColor" }) => (
  <Music size={size} color={color} />
);

export const YouthIcon = ({ size = 24, color = "currentColor" }) => (
  <Sprout size={size} color={color} />
);

export const OutreachIcon = ({ size = 24, color = "currentColor" }) => (
  <HandHeart size={size} color={color} />
);

export const BibleStudyIcon = ({ size = 24, color = "currentColor" }) => (
  <Book size={size} color={color} />
);

export const ChildrenIcon = ({ size = 24, color = "currentColor" }) => (
  <GraduationCap size={size} color={color} />
);

// Contact Icons
export const EmailIcon = ({ size = 24, color = "currentColor" }) => (
  <Mail size={size} color={color} />
);

export const PhoneIcon = ({ size = 24, color = "currentColor" }) => (
  <Phone size={size} color={color} />
);

export const LocationIcon = ({ size = 24, color = "currentColor" }) => (
  <MapPin size={size} color={color} />
);

export const TimeIcon = ({ size = 24, color = "currentColor" }) => (
  <Clock size={size} color={color} />
);

// UI Icons
export const MenuIcon = ({ size = 24, color = "currentColor" }) => (
  <Menu size={size} color={color} />
);

export const ChevronRightIcon = ({ size = 24, color = "currentColor" }) => (
  <ChevronRight size={size} color={color} />
);

export const ChevronLeftIcon = ({ size = 24, color = "currentColor" }) => (
  <ChevronLeft size={size} color={color} />
);

export const ChevronDownIcon = ({ size = 24, color = "currentColor" }) => (
  <ChevronDown size={size} color={color} />
);

export const MoreIcon = ({ size = 24, color = "currentColor" }) => (
  <MoreHorizontal size={size} color={color} />
);

// Status Icons
export const SuccessIcon = ({ size = 24, color = "#10B981" }) => (
  <Check size={size} color={color} />
);

export const ErrorIcon = ({ size = 24, color = "#EF4444" }) => (
  <X size={size} color={color} />
);

export const WarningIcon = ({ size = 24, color = "#F59E0B" }) => (
  <div className="relative">
    <div 
      className="absolute inset-0 bg-yellow-500 rounded-full opacity-20"
      style={{ width: size, height: size }}
    />
    <div className="text-center font-bold text-yellow-600" style={{ fontSize: size * 0.6 }}>
      !
    </div>
  </div>
);

// Export all icons for easy importing
export default {
  AppIcon,
  DashboardIcon,
  PrayerIcon,
  GivingIcon,
  EventsIcon,
  ProfileIcon,
  MembersIcon,
  SermonsIcon,
  MinistriesIcon,
  ResourcesIcon,
  SettingsIcon,
  NotificationIcon,
  LogoutIcon,
  AddIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  UploadIcon,
  EditIcon,
  DeleteIcon,
  CheckIcon,
  CloseIcon,
  ViewIcon,
  LockIcon,
  WorshipIcon,
  YouthIcon,
  OutreachIcon,
  BibleStudyIcon,
  ChildrenIcon,
  EmailIcon,
  PhoneIcon,
  LocationIcon,
  TimeIcon,
  MenuIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  MoreIcon,
  SuccessIcon,
  ErrorIcon,
  WarningIcon
};