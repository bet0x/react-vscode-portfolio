import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Button,
  Paper,
  Divider,
  Skeleton,
  Alert,
  Chip
} from '@mui/material';
import {
  ArrowBack,
  Home
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { articlesService } from '../services/ArticlesService';
import { Article } from '../types/Article';
import ArticleMetadata from './ArticleMetadata';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  materialLight,
  materialDark,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@mui/material/styles';

// Import markdown components from MDContainer
import {
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  tableCellClasses,
  styled
} from '@mui/material';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

interface ArticleContainerProps {
  slug?: string;
}

const ArticleContainer: React.FC<ArticleContainerProps> = ({ slug }) => {
  const [article, setArticle] = useState<Article | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const navigate = useNavigate();
  const params = useParams();
  
  const articleSlug = slug || params.slug;

  useEffect(() => {
    if (articleSlug) {
      loadArticle(articleSlug);
    }
  }, [articleSlug]);

  useEffect(() => {
    if (article) {
      document.title = `${process.env.REACT_APP_NAME} | ${article.metadata.title}`;
    }
  }, [article]);

  const loadArticle = async (slug: string) => {
    try {
      setLoading(true);
      setError(null);

      const articleData = await articlesService.getArticleBySlug(slug);

      if (!articleData) {
        setError('Article not found');
        return;
      }

      setArticle(articleData);
    } catch (err) {
      setError('Failed to load article');
      console.error('Error loading article:', err);
    } finally {
      setLoading(false);
    }
  };

  // Markdown component configurations (similar to MDContainer)
  const MarkdownLink = (props: any) => (
    <Link href={props.href} target="_blank" underline="hover">
      {props.children}
    </Link>
  );

  const MarkdownImage = (props: any) => {
    const isDarkMode = theme.palette.mode === 'dark';
    const isShieldsBadge = props.src.includes('shields.io');
    
    if (isShieldsBadge) {
      const labelColor = isDarkMode ? '2f363d' : 'f0f0f0';
      const color = isDarkMode ? '58a6ff' : '0366d6';
      const logoColor = isDarkMode ? 'ffffff' : '333333';
      
      const updatedSrc = props.src
        .replace('style=social', 'style=flat')
        .concat(`&labelColor=${labelColor}&color=${color}&logo=github&logoColor=${logoColor}`);
      
      return <img src={updatedSrc} alt={props.alt} style={{ maxWidth: '100%' }} />;
    }
    
    return <img src={props.src} alt={props.alt} style={{ maxWidth: '100%' }} />;
  };

  const MarkdownTable = (props: { children: React.ReactNode }) => (
    <TableContainer component={Paper} sx={{ margin: '16px 0' }}>
      <Table size="small">
        {props.children}
      </Table>
    </TableContainer>
  );

  const MarkdownTableCell = (props: any) => {
    if (props.style && props.style.textAlign === 'right') {
      return (
        <StyledTableCell sx={{ textAlign: 'right' }}>
          {props.children}
        </StyledTableCell>
      );
    }
    return <StyledTableCell>{props.children}</StyledTableCell>;
  };

  const MarkdownTableRow = (props: { children: React.ReactNode }) => (
    <StyledTableRow>{props.children}</StyledTableRow>
  );

  const MarkdownCode = (props: any) => {
    const isDarkMode = theme.palette.mode === 'dark';
    
    if (props.inline) {
      return <Chip size="small" label={props.children?.toString()} />;
    }
    
    if (props.className) {
      const language = props.className.split('-')[1];
      return (
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? materialDark : materialLight}
          PreTag="div"
          showLineNumbers={true}
        >
          {props.children.toString().trim()}
        </SyntaxHighlighter>
      );
    }
    
    return (
      <SyntaxHighlighter
        style={isDarkMode ? materialDark : materialLight}
        PreTag="div"
      >
        {props.children}
      </SyntaxHighlighter>
    );
  };

  const MarkdownDivider = () => {
    const isDarkMode = theme.palette.mode === 'dark';
    return (
      <Divider sx={{ 
        bgcolor: isDarkMode ? '#393939' : '#eeeeee',
        margin: '24px 0'
      }} />
    );
  };

  const MarkdownBlockquote = (props: any) => (
    <Box sx={{ 
      borderLeft: 3, 
      borderColor: 'primary.main',
      paddingLeft: 2,
      margin: '16px 0',
      fontStyle: 'italic'
    }}>
      <blockquote style={{ margin: 0 }}>{props.children}</blockquote>
    </Box>
  );

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={60} />
        <Skeleton variant="text" width="80%" height={30} />
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Container>
    );
  }

  if (error || !article) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Article not found'}
        </Alert>
        <Button
          startIcon={<Home />}
          onClick={() => navigate('/articles')}
          variant="contained"
        >
          Back to Articles
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back to Articles Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/articles')}
        sx={{ mb: 3 }}
        variant="text"
      >
        Back to Articles
      </Button>

      {/* Article Metadata */}
      <ArticleMetadata
        metadata={article.metadata}
        readingTime={article.readingTime}
      />

      {/* Article Content */}
      <Box sx={{ 
        '& h1': { fontSize: '2rem', mt: 4, mb: 2 },
        '& h2': { fontSize: '1.5rem', mt: 3, mb: 2 },
        '& h3': { fontSize: '1.25rem', mt: 2, mb: 1 },
        '& p': { mb: 2, lineHeight: 1.7 },
        '& ul, & ol': { mb: 2, pl: 3 },
        '& li': { mb: 1 },
        '& pre': { mb: 2 },
        '& blockquote': { mb: 2 }
      }}>
        <ReactMarkdown
          components={{
            code: MarkdownCode,
            a: MarkdownLink,
            table: MarkdownTable,
            thead: TableHead,
            tbody: TableBody,
            th: MarkdownTableCell,
            tr: MarkdownTableRow,
            td: MarkdownTableCell,
            tfoot: TableFooter,
            hr: MarkdownDivider,
            img: MarkdownImage,
            blockquote: MarkdownBlockquote,
          }}
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
        >
          {article.content}
        </ReactMarkdown>
      </Box>
    </Container>
  );
};

export default ArticleContainer;
