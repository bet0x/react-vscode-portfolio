# Blog Implementation Plan

## Overview
Implement a blog system using the existing markdown infrastructure with frontmatter metadata support, pretty URLs, and dynamic article loading.

## Required Modifications

### 1. Article Structure & Frontmatter Support

#### Create Article Parser Component
- **File**: `src/app/components/ArticleParser.tsx`
- **Purpose**: Parse frontmatter (title, date, tags, summary, author) from markdown files
- **Dependencies**: Install `gray-matter` library for frontmatter parsing
```bash
npm install gray-matter
npm install @types/gray-matter --save-dev
```

#### Article Metadata Interface
- **File**: `src/app/types/Article.ts`
- **Content**: TypeScript interfaces for article metadata

### 2. New Components

#### BlogIndex Component
- **File**: `src/app/components/BlogIndex.tsx`
- **Purpose**: Display list of all articles with pagination, filtering by tags
- **Features**: 
  - Article cards with title, date, summary, tags
  - Tag filtering
  - Date sorting (newest first)
  - Search functionality

#### ArticleContainer Component  
- **File**: `src/app/components/ArticleContainer.tsx`
- **Purpose**: Enhanced MDContainer specifically for articles
- **Features**:
  - Frontmatter metadata display (title, date, author, tags)
  - Reading time estimation
  - Article navigation (previous/next)
  - Social sharing buttons

#### ArticleMetadata Component
- **File**: `src/app/components/ArticleMetadata.tsx`
- **Purpose**: Display article metadata in a styled format
- **Features**: Author, date, tags, reading time

### 3. Routing Modifications

#### Update Router Configuration
- **File**: `src/app/App.tsx` (or main router file)
- **Changes**:
  - Add dynamic route for articles: `/articles/:slug`
  - Add articles index route: `/articles`
  - Maintain backward compatibility with existing routes

#### Articles Service
- **File**: `src/app/services/ArticlesService.ts`
- **Purpose**: 
  - Load all articles from `/public/pages/articles/`
  - Parse frontmatter
  - Generate slugs from filenames
  - Provide article filtering and sorting methods

### 4. Article Files Structure

#### Sample Articles Directory Structure
```
public/pages/articles/
├── apache-execcgi-fpm.md
├── linux-performance-monitoring.md
├── docker-optimization-tips.md
└── ai-models-deployment.md
```

#### Article Template Format
```markdown
---
title: "Apache con ExecCGI y FPM"
date: "2022-09-22"
tags: ["apache", "execcgi", "fpm", "php"]
summary: "Una simple receta con notas de como se debe configurar un Virtual Host con Apache para que ejecute CGIs y PHP."
author: "Alberto Ferrer"
slug: "apache-execcgi-fpm"
---

Content goes here...
```

### 5. Navigation Updates

#### Update Sidebar Navigation
- **File**: `src/app/layout/AppTree.tsx`
- **Changes**: 
  - Add expandable "Articles" section
  - Show recent articles in sidebar
  - Dynamic loading of article list

#### Update pages.ts
- **File**: `src/app/pages/pages.ts`
- **Changes**: Add articles route configuration

### 6. Utility Functions

#### Article Utils
- **File**: `src/app/utils/articleUtils.ts`
- **Functions**:
  - `generateSlug(title: string): string`
  - `calculateReadingTime(content: string): number`
  - `formatDate(date: string): string`
  - `extractExcerpt(content: string, length: number): string`

#### SEO and Meta Tags
- **File**: `src/app/hooks/useArticleMeta.tsx`
- **Purpose**: Dynamic meta tags for each article (title, description, keywords)

### 7. Styling Enhancements

#### Article-specific Styles
- **File**: `src/app/styles/article.css`
- **Content**: 
  - Article card styling
  - Metadata display styling
  - Tag chips styling
  - Reading progress bar

### 8. Configuration Updates

#### Environment Variables
- **File**: `.env`
- **New Variables**:
  - `REACT_APP_ARTICLES_PER_PAGE=10`
  - `REACT_APP_BLOG_TITLE="Alberto Ferrer Blog"`

## Implementation Steps

### Phase 1: Core Infrastructure
1. Install dependencies (`gray-matter`)
2. Create article interfaces and types
3. Create ArticleParser component
4. Create ArticlesService for loading articles

### Phase 2: Article Components
1. Create ArticleContainer component
2. Create ArticleMetadata component
3. Create BlogIndex component
4. Update routing configuration

### Phase 3: Sample Content
1. Create 4-5 sample articles
2. Test article loading and parsing
3. Verify pretty URLs work correctly

### Phase 4: Navigation Integration
1. Update sidebar to show articles
2. Update main navigation
3. Add breadcrumbs for articles

### Phase 5: Enhancement Features
1. Add search functionality
2. Add tag filtering
3. Add pagination
4. Add SEO meta tags

## Sample URLs Structure

```
/articles                           → Blog index
/articles/apache-execcgi-fpm       → Specific article
/articles/tag/apache               → Articles filtered by tag
/articles/search?q=performance     → Search results
```

## Dependencies to Install

```bash
npm install gray-matter
npm install @types/gray-matter --save-dev
npm install date-fns  # for date formatting
npm install slugify   # for URL-friendly slugs
```

## File Size Estimate
- New files: ~15-20 new files
- Modified files: ~5-7 existing files
- Total additional code: ~1500-2000 lines

## Testing Requirements
1. Unit tests for article parsing
2. Integration tests for article loading
3. Route testing for dynamic URLs
4. Performance testing for article listing

## SEO Considerations
- Dynamic meta tags for each article
- Structured data for articles
- XML sitemap generation for articles
- Open Graph meta tags for social sharing
