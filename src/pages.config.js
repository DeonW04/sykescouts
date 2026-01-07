import About from './pages/About';
import AdminSettings from './pages/AdminSettings';
import CompleteRegistration from './pages/CompleteRegistration';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import Home from './pages/Home';
import JoinUs from './pages/JoinUs';
import LeaderDashboard from './pages/LeaderDashboard';
import LeaderMembers from './pages/LeaderMembers';
import MemberDetail from './pages/MemberDetail';
import ParentDashboard from './pages/ParentDashboard';
import Parents from './pages/Parents';
import Sections from './pages/Sections';
import Volunteer from './pages/Volunteer';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminSettings": AdminSettings,
    "CompleteRegistration": CompleteRegistration,
    "Contact": Contact,
    "Gallery": Gallery,
    "Home": Home,
    "JoinUs": JoinUs,
    "LeaderDashboard": LeaderDashboard,
    "LeaderMembers": LeaderMembers,
    "MemberDetail": MemberDetail,
    "ParentDashboard": ParentDashboard,
    "Parents": Parents,
    "Sections": Sections,
    "Volunteer": Volunteer,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};