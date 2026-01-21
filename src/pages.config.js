import About from './pages/About';
import AdminSettings from './pages/AdminSettings';
import AwardBadges from './pages/AwardBadges';
import BadgeDetail from './pages/BadgeDetail';
import CompleteRegistration from './pages/CompleteRegistration';
import Contact from './pages/Contact';
import EditBadgeStructure from './pages/EditBadgeStructure';
import EventDetail from './pages/EventDetail';
import Home from './pages/Home';
import Join from './pages/Join';
import LeaderAttendance from './pages/LeaderAttendance';
import LeaderBadges from './pages/LeaderBadges';
import LeaderDashboard from './pages/LeaderDashboard';
import LeaderEvents from './pages/LeaderEvents';
import LeaderMembers from './pages/LeaderMembers';
import LeaderProgramme from './pages/LeaderProgramme';
import ManageBadges from './pages/ManageBadges';
import MeetingDetail from './pages/MeetingDetail';
import MemberDetail from './pages/MemberDetail';
import MyChild from './pages/MyChild';
import ParentBadges from './pages/ParentBadges';
import ParentDashboard from './pages/ParentDashboard';
import ParentEventDetail from './pages/ParentEventDetail';
import ParentEvents from './pages/ParentEvents';
import ParentProgramme from './pages/ParentProgramme';
import Parents from './pages/Parents';
import Sections from './pages/Sections';
import Volunteer from './pages/Volunteer';
import Gallery from './pages/Gallery';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminSettings": AdminSettings,
    "AwardBadges": AwardBadges,
    "BadgeDetail": BadgeDetail,
    "CompleteRegistration": CompleteRegistration,
    "Contact": Contact,
    "EditBadgeStructure": EditBadgeStructure,
    "EventDetail": EventDetail,
    "Home": Home,
    "Join": Join,
    "LeaderAttendance": LeaderAttendance,
    "LeaderBadges": LeaderBadges,
    "LeaderDashboard": LeaderDashboard,
    "LeaderEvents": LeaderEvents,
    "LeaderMembers": LeaderMembers,
    "LeaderProgramme": LeaderProgramme,
    "ManageBadges": ManageBadges,
    "MeetingDetail": MeetingDetail,
    "MemberDetail": MemberDetail,
    "MyChild": MyChild,
    "ParentBadges": ParentBadges,
    "ParentDashboard": ParentDashboard,
    "ParentEventDetail": ParentEventDetail,
    "ParentEvents": ParentEvents,
    "ParentProgramme": ParentProgramme,
    "Parents": Parents,
    "Sections": Sections,
    "Volunteer": Volunteer,
    "Gallery": Gallery,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};