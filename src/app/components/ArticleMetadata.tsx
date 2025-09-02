import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Avatar,
  Card,
  CardContent
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  Tag
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ArticleMetadata as ArticleMetadataType } from '../types/Article';
import { articlesService } from '../services/ArticlesService';

interface ArticleMetadataProps {
  metadata: ArticleMetadataType;
  readingTime: number;
  showCard?: boolean;
}

const ArticleMetadata: React.FC<ArticleMetadataProps> = ({
  metadata,
  readingTime,
  showCard = false
}) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    return articlesService.formatDate(dateString);
  };

  const content = (
    <Box>
      {/* Article Title */}
      <Typography 
        variant="h1" 
        component="h1"
        sx={{
          fontSize: { xs: '2rem', md: '2.5rem' },
          fontWeight: 'bold',
          marginBottom: 2,
          lineHeight: 1.2
        }}
      >
        {metadata.title}
      </Typography>

      {/* Summary */}
      {metadata.summary && (
        <Typography
          variant="h2"
          component="p"
          sx={{
            fontSize: '1.2rem',
            fontWeight: 400,
            color: 'text.secondary',
            marginBottom: 3,
            fontStyle: 'italic'
          }}
        >
          {metadata.summary}
        </Typography>
      )}

      {/* Metadata Row */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ marginBottom: 2 }}
      >
        {/* Author */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
            {metadata.author.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            {metadata.author}
          </Typography>
        </Stack>

        {/* Date */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarToday sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate(metadata.date)}
          </Typography>
        </Stack>

        {/* Reading Time */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccessTime sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {readingTime} min read
          </Typography>
        </Stack>
      </Stack>

      {/* Tags */}
      {metadata.tags && metadata.tags.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ marginBottom: 3 }}>
          <Tag sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {metadata.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: '24px',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    cursor: 'pointer'
                  }
                }}
                onClick={() => {
                  // Navigate to tag filter page
                  navigate(`/articles?tag=${encodeURIComponent(tag)}`);
                }}
              />
            ))}
          </Stack>
        </Stack>
      )}

      <Divider sx={{ marginBottom: 3 }} />
    </Box>
  );

  if (showCard) {
    return (
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default ArticleMetadata;
