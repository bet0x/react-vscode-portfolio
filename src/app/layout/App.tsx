import {
  Container,
  createTheme,
  CssBaseline,
  darkScrollbar,
  Grid,
  Stack,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import AppTree from "./AppTree";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import AppButtons from "./AppButtons";
import MDContainer from "../components/MDContainer";
import Home from "../pages/Home";
import BlogIndex from "../components/BlogIndex";
import ArticleContainer from "../components/ArticleContainer";
import { pages } from "../pages/pages";
import usePageTracking from "../hooks/usePageTracking";
import { isBrowser } from "react-device-detect";
import { articlesService } from "../services/ArticlesService";

interface Page {
  index: number;
  name: string;
  route: string;
  visible: boolean;
  isArticle?: boolean;
  articleSlug?: string;
}

function initVisiblePageIndexs(pages: Page[]) {
  const tabs = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page.visible) tabs.push(page.index);
  }
  return tabs;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(isBrowser);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentComponent, setCurrentComponent] = useState("");
  const [visiblePageIndexs, setVisiblePageIndexs] = useState(
    initVisiblePageIndexs(pages)
  );
  const [darkMode, setDarkMode] = useState(false);
  const [visiblePages, setVisiblePages] = useState(
    pages.filter((x) => x.visible)
  );
  const [articlePages, setArticlePages] = useState<Page[]>([]);
  const [nextArticleIndex, setNextArticleIndex] = useState(1000); // Start article indexes at 1000
  const paletteType = darkMode ? "dark" : "light";
  usePageTracking();
  const theme = createTheme({
    palette: {
      mode: paletteType,
      background: {
        default: paletteType === "light" ? "#FFFFFF" : "#1e1e1e",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: paletteType === "dark" ? darkScrollbar() : null,
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: "rgba(255, 255, 255, 0.12)",
          },
        },
      },
    },
  });

  function handleThemeChange() {
    setDarkMode(!darkMode);
    localStorage.setItem("theme", darkMode ? "light" : "dark");
  }

  // Function to add article as a tab
  const addArticleTab = useCallback(async (slug: string) => {
    // Check if article tab already exists
    const existingArticle = articlePages.find(page => page.articleSlug === slug);
    if (existingArticle) {
      setSelectedIndex(existingArticle.index);
      return;
    }

    // Get article data to create tab
    try {
      const article = await articlesService.getArticleBySlug(slug);
      if (article) {
        const newArticlePage: Page = {
          index: nextArticleIndex,
          name: `${slug}.md`,
          route: `/article/${slug}`,
          visible: true,
          isArticle: true,
          articleSlug: slug
        };

        setArticlePages(prev => [...prev, newArticlePage]);
        setVisiblePageIndexs(prev => [...prev, nextArticleIndex]);
        setSelectedIndex(nextArticleIndex);
        setNextArticleIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading article for tab:', error);
    }
  }, [articlePages, nextArticleIndex]);

  // Function to remove article tab
  const removeArticleTab = useCallback((index: number) => {
    setArticlePages(prev => prev.filter(page => page.index !== index));
    setVisiblePageIndexs(prev => prev.filter(idx => idx !== index));
  }, []);

  // Detect navigation to articles
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/article/')) {
      const slug = currentPath.replace('/article/', '');
      addArticleTab(slug);
    }
  }, [location.pathname, addArticleTab]);

  useEffect(() => {
    const currentTheme = localStorage.getItem("theme");
    if (!currentTheme) setDarkMode(true);
    else setDarkMode(currentTheme === "dark");
  }, []);

  const deletedIndex = visiblePages.find(
    (x) => !visiblePageIndexs.includes(x.index)
  )?.index;

  useEffect(() => {
    // Combine static pages and article pages
    const staticPages = visiblePageIndexs
      .map((index) => pages.find((x) => x.index === index))
      .filter((page): page is Page => page !== undefined);
    
    const dynamicArticlePages = visiblePageIndexs
      .map((index) => articlePages.find((x) => x.index === index))
      .filter((page): page is Page => page !== undefined);

    const allPages = [...staticPages, ...dynamicArticlePages];
    setVisiblePages(allPages);

    if (visiblePageIndexs.length === 0) {
      // No visible pages, reset selection and navigate to the home page
      setSelectedIndex(-1);
      navigate("/");
      return;
    }

    if (deletedIndex === selectedIndex) {
      // Handle tab deletion and update the selected index
      const newSelectedIndex =
        deletedIndex > Math.max(...visiblePageIndexs)
          ? Math.max(...visiblePageIndexs)
          : Math.min(...visiblePageIndexs);

      setSelectedIndex(newSelectedIndex);

      const newPage = allPages.find((x) => x.index === newSelectedIndex);
      if (newPage) navigate(newPage.route);
    }
  }, [visiblePageIndexs, navigate, deletedIndex, selectedIndex, articlePages]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Container
        sx={{ m: 0, p: 0, overflowY: "hidden" }}
        maxWidth={false}
        disableGutters
      >
        <Grid container sx={{ overflow: "auto", overflowY: "hidden" }}>
          <Grid container sx={{ overflow: "auto" }}>
            <Grid item sx={{ width: 50 }}>
              <Sidebar
                setExpanded={setExpanded}
                expanded={expanded}
                darkMode={darkMode}
                handleThemeChange={handleThemeChange}
                setSelectedIndex={setSelectedIndex}
              />
            </Grid>
            {expanded && (
              <Grid
                item
                sx={{
                  backgroundColor: darkMode ? "#252527" : "#f3f3f3",
                  width: 220,
                }}
              >
                <Stack sx={{ mt: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 4 }}
                  >
                    EXPLORER
                  </Typography>
                  <AppTree
                    pages={pages.filter((x) => x.visible)}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    currentComponent={currentComponent}
                    setCurrentComponent={setCurrentComponent}
                    visiblePageIndexs={visiblePageIndexs}
                    setVisiblePageIndexs={setVisiblePageIndexs}
                  />
                </Stack>
              </Grid>
            )}

            <Grid item xs zeroMinWidth>
              <Grid
                sx={{
                  height: "33px",
                }}
              >
                <AppButtons
                  pages={visiblePages}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                  currentComponent={currentComponent}
                  setCurrentComponent={setCurrentComponent}
                  visiblePageIndexs={visiblePageIndexs}
                  setVisiblePageIndexs={setVisiblePageIndexs}
                  removeArticleTab={removeArticleTab}
                />
              </Grid>

              <Grid
                sx={{
                  scrollBehavior: "smooth",
                  overflowY: "auto",
                  height: `calc(100vh - 20px - 33px)`,
                }}
              >
                <Routes>
                  <Route
                    path="/"
                    element={<Home setSelectedIndex={setSelectedIndex} />}
                  />
                  
                  {/* Blog Routes */}
                  <Route
                    path="/articles"
                    element={<BlogIndex />}
                  />
                  <Route
                    path="/article/:slug"
                    element={<ArticleContainer />}
                  />
                  
                  {/* Static Page Routes */}
                  {pages.filter(page => page.route !== '/articles').map(({ index, name, route }) => (
                    <Route
                      key={index}
                      path={route}
                      element={<MDContainer path={`./pages/${name}`} />}
                    />
                  ))}
                  <Route
                    path="/docs"
                    element={<MDContainer path={`./pages/docs.md`} />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Grid>
            </Grid>
          </Grid>
          <Grid item lg={12} md={12} sm={12} xs={12}>
            <Footer />
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}
