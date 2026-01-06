import About from './pages/About';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import Home from './pages/Home';
import JoinUs from './pages/JoinUs';
import Parents from './pages/Parents';
import Sections from './pages/Sections';
import Volunteer from './pages/Volunteer';
import ParentDashboard from './pages/ParentDashboard';
import LeaderDashboard from './pages/LeaderDashboard';
import LeaderMembers from './pages/LeaderMembers';
import MemberDetail from './pages/MemberDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "Contact": Contact,
    "Gallery": Gallery,
    "Home": Home,
    "JoinUs": JoinUs,
    "Parents": Parents,
    "Sections": Sections,
    "Volunteer": Volunteer,
    "ParentDashboard": ParentDashboard,
    "LeaderDashboard": LeaderDashboard,
    "LeaderMembers": LeaderMembers,
    "MemberDetail": MemberDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};