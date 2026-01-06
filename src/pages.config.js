import About from './pages/About';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import Home from './pages/Home';
import JoinUs from './pages/JoinUs';
import Parents from './pages/Parents';
import Sections from './pages/Sections';
import Volunteer from './pages/Volunteer';
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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};