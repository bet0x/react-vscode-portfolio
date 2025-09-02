import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  TextField,
  Box,
  Pagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Alert,
  Paper
} from '@mui/material';
import {
  Search,
  CalendarToday,
  AccessTime,
  Tag,
  Person,
  FilterList
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { articlesService } from '../services/ArticlesService';
import {
  ArticleListItem,
  ArticleSearchParams,
  ArticleSearchResult,
  TagCount
} from '../types/Article';

const BlogIndex: React.FC = () => {
  const [searchResult, setSearchResult] = useState<ArticleSearchResult | null>(null);
  const [allTags, setAllTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [sortBy, setSortBy] = useState<'date' | 'title'>(
    (searchParams.get('sortBy') as 'date' | 'title') || 'date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1')
  );

  const loadInitialData = async () => {
    try {
      setError(null);
      const tags = await articlesService.getAllTags();
      setAllTags(tags);
    } catch (err) {
      setError('Failed to load blog data');
      console.error('Error loading initial data:', err);
    }
  };

  const searchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchParams: ArticleSearchParams = {
        query: searchQuery || undefined,
        tag: selectedTag || undefined,
        sortBy,
        sortOrder,
        page: currentPage
      };

      const result = await articlesService.searchArticles(searchParams);
      setSearchResult(result);
    } catch (err) {
      setError('Failed to search articles');
      console.error('Error searching articles:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTag, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    document.title = `${process.env.REACT_APP_NAME} | Articles`;
    loadInitialData();
  }, []);

  useEffect(() => {
    searchArticles();
  }, [searchArticles]);

  useEffect(() => {
    // Update URL parameters
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (selectedTag) params.set('tag', selectedTag);
    if (sortBy !== 'date') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (currentPage !== 1) params.set('page', currentPage.toString());
    
    setSearchParams(params);
  }, [searchQuery, selectedTag, sortBy, sortOrder, currentPage, setSearchParams]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleTagFilter = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setSortBy('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return articlesService.formatDate(dateString);
  };

  const renderArticleCard = (article: ArticleListItem) => (
    <Grid item xs={12} key={article.metadata.slug}>
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Article Title */}
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              cursor: 'pointer',
              '&:hover': {
                color: 'primary.main'
              }
            }}
            onClick={() => navigate(`/article/${article.metadata.slug}`)}
          >
            {article.metadata.title}
          </Typography>

          {/* Article Metadata */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Person sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {article.metadata.author}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CalendarToday sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {formatDate(article.metadata.date)}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <AccessTime sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {article.readingTime} min read
              </Typography>
            </Stack>
          </Stack>

          {/* Article Excerpt */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.6
            }}
          >
            {article.excerpt}
          </Typography>

          {/* Tags */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {article.metadata.tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                onClick={() => handleTagFilter(tag)}
                sx={{
                  fontSize: '0.7rem',
                  height: '20px',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText'
                  }
                }}
              />
            ))}
            {article.metadata.tags.length > 3 && (
              <Typography variant="caption" color="text.secondary">
                +{article.metadata.tags.length - 3} more
              </Typography>
            )}
          </Stack>
        </CardContent>

        <CardActions>
          <Button
            size="small"
            onClick={() => navigate(`/article/${article.metadata.slug}`)}
            variant="contained"
          >
            Read Article
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderLoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid item xs={12} key={index}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="80%" height={40} />
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="rectangular" width="100%" height={80} />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Skeleton variant="rectangular" width={60} height={20} />
                <Skeleton variant="rectangular" width={80} height={20} />
                <Skeleton variant="rectangular" width={70} height={20} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        
      {/* Search and Filter Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack spacing={3}>
          {/* Search Bar */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {/* Filters Row */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            {/* Sort By */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title')}
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="title">Title</MenuItem>
              </Select>
            </FormControl>

            {/* Sort Order */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                value={sortOrder}
                label="Order"
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <MenuItem value="desc">Newest First</MenuItem>
                <MenuItem value="asc">Oldest First</MenuItem>
              </Select>
            </FormControl>

            {/* Clear Filters */}
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={handleClearFilters}
              disabled={!searchQuery && !selectedTag}
            >
              Clear Filters
            </Button>
          </Stack>

          {/* Popular Tags */}
          {allTags.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <Tag sx={{ fontSize: '1rem', mr: 1 }} />
                Popular Tags:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {allTags.slice(0, 10).map(({ tag, count }) => (
                  <Chip
                    key={tag}
                    label={`${tag} (${count})`}
                    size="small"
                    variant={selectedTag === tag ? 'filled' : 'outlined'}
                    onClick={() => handleTagFilter(tag)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Active Filters */}
      {(searchQuery || selectedTag) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Filters:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {searchQuery && (
              <Chip
                label={`Search: "${searchQuery}"`}
                onDelete={() => setSearchQuery('')}
                size="small"
              />
            )}
            {selectedTag && (
              <Chip
                label={`Tag: ${selectedTag}`}
                onDelete={() => setSelectedTag('')}
                size="small"
              />
            )}
          </Stack>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && renderLoadingSkeleton()}

      {/* Articles Grid */}
      {!loading && searchResult && (
        <>
          {/* Results Summary */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchResult.totalCount > 0 ? (
              `Showing ${searchResult.articles.length} of ${searchResult.totalCount} articles`
            ) : (
              'No articles found matching your criteria'
            )}
          </Typography>

          {/* Articles List */}
          {searchResult.articles.length > 0 ? (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {searchResult.articles.map(renderArticleCard)}
            </Grid>
          ) : (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No articles found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search terms or filters
              </Typography>
            </Box>
          )}

          {/* Pagination */}
          {searchResult.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={searchResult.totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default BlogIndex;
