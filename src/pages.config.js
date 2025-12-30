import Home from './pages/Home';
import About from './pages/About';
import Sections from './pages/Sections';
import Parents from './pages/Parents';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import JoinUs from './pages/JoinUs';
import Volunteer from './pages/Volunteer';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "About": About,
    "Sections": Sections,
    "Parents": Parents,
    "Gallery": Gallery,
    "Contact": Contact,
    "JoinUs": JoinUs,
    "Volunteer": Volunteer,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};