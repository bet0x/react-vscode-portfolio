import {
  FaBookReader,
  FaGithub,
  FaLinkedin,
  FaEnvelope,
} from "react-icons/fa";

export const links = [
  {
    index: 0,
    title: "Find me on Github",
    href: "https://github.com/bet0x",
    icon: <FaGithub />,
  },
  {
    index: 1,
    title: "Find me on LinkedIn",
    href: "https://www.linkedin.com/in/bet0x/",
    icon: <FaLinkedin />,
  },
  {
    index: 2,
    title: "Contact me via email",
    href: "mailto:albertof@barrahome.org",
    icon: <FaEnvelope />,
  },
  {
    index: 4,
    title: "Read my articles",
    href: "/articles",
    icon: <FaBookReader />,
  },
];
