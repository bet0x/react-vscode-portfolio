import matter from 'gray-matter';
import { format } from 'date-fns';
import slugify from 'slugify';
import {
  Article,
  ArticleListItem,
  ArticleMetadata,
  ArticleSearchParams,
  ArticleSearchResult,
  BlogConfig,
  TagCount,
  ArticleNavigation,
  BlogSettings
} from '../types/Article';

export class ArticlesService {
  private articles: Article[] = [];
  private config: BlogConfig = {
    articlesPerPage: 10,
    excerptLength: 200,
    dateFormat: 'MMMM dd, yyyy'
  };

  constructor() {
    this.loadArticles();
  }

  private async loadArticles(): Promise<void> {
    try {
      // Get list of article files
      const articleFiles = await this.getArticleFiles();
      const loadedArticles: Article[] = [];

      for (const filename of articleFiles) {
        try {
          const article = await this.loadSingleArticle(filename);
          if (article) {
            loadedArticles.push(article);
          }
        } catch (error) {
          console.warn(`Failed to load article ${filename}:`, error);
        }
      }

      // Sort articles by date (newest first)
      this.articles = loadedArticles.sort((a, b) => 
        new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
      );

    } catch (error) {
      console.error('Failed to load articles:', error);
      this.articles = [];
    }
  }

  private async getArticleFiles(): Promise<string[]> {
    // In a real implementation, this would scan the articles directory
    // For now, we'll use the known article files
    return [
      'apache-execcgi-fpm.md',
      'linux-performance-monitoring.md',
      'ai-model-deployment-kubernetes.md',
      'docker-optimization-production.md',
      'rust-system-tools-development.md'
    ];
  }

  private async loadSingleArticle(filename: string): Promise<Article | null> {
    try {
      const response = await fetch(`/pages/articles/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
      }

      const fileContent = await response.text();
      const { data, content } = matter(fileContent);

      // Validate required metadata
      if (!data.title || !data.date || !data.author) {
        console.warn(`Missing required metadata in ${filename}`);
        return null;
      }

      const metadata: ArticleMetadata = {
        title: data.title,
        date: data.date,
        tags: Array.isArray(data.tags) ? data.tags : [],
        summary: data.summary || '',
        author: data.author,
        slug: data.slug || this.generateSlug(data.title)
      };

      const excerpt = this.extractExcerpt(content, this.config.excerptLength);
      const readingTime = this.calculateReadingTime(content);

      return {
        metadata,
        content,
        excerpt,
        readingTime,
        filename,
        path: `/article/${metadata.slug}`
      };

    } catch (error) {
      console.error(`Error loading article ${filename}:`, error);
      return null;
    }
  }

  private generateSlug(title: string): string {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }

  private extractExcerpt(content: string, length: number): string {
    // Remove markdown formatting for excerpt
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/\n\s*\n/g, ' ') // Replace multiple newlines with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (plainText.length <= length) {
      return plainText;
    }

    // Find the last complete word within the length limit
    const truncated = plainText.substring(0, length);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > length * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  // Public API methods

  async getArticles(): Promise<Article[]> {
    if (this.articles.length === 0) {
      await this.loadArticles();
    }
    return this.articles;
  }

  async getArticleBySlug(slug: string): Promise<Article | null> {
    const articles = await this.getArticles();
    return articles.find(article => article.metadata.slug === slug) || null;
  }

  async getArticlesList(): Promise<ArticleListItem[]> {
    const articles = await this.getArticles();
    return articles.map(article => ({
      metadata: article.metadata,
      excerpt: article.excerpt,
      readingTime: article.readingTime,
      filename: article.filename,
      path: article.path
    }));
  }

  async searchArticles(params: ArticleSearchParams): Promise<ArticleSearchResult> {
    let articles = await this.getArticlesList();

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      articles = articles.filter(article =>
        article.metadata.title.toLowerCase().includes(query) ||
        article.metadata.summary.toLowerCase().includes(query) ||
        article.metadata.tags.some(tag => tag.toLowerCase().includes(query)) ||
        article.excerpt.toLowerCase().includes(query)
      );
    }

    if (params.tag) {
      articles = articles.filter(article =>
        article.metadata.tags.includes(params.tag!)
      );
    }

    // Apply sorting
    const sortBy = params.sortBy || 'date';
    const sortOrder = params.sortOrder || 'desc';

    articles.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.metadata.date).getTime() - new Date(b.metadata.date).getTime();
      } else if (sortBy === 'title') {
        comparison = a.metadata.title.localeCompare(b.metadata.title);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const page = params.page || 1;
    const articlesPerPage = this.config.articlesPerPage;
    const totalCount = articles.length;
    const totalPages = Math.ceil(totalCount / articlesPerPage);
    const startIndex = (page - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;

    const paginatedArticles = articles.slice(startIndex, endIndex);

    return {
      articles: paginatedArticles,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  async getAllTags(): Promise<TagCount[]> {
    const articles = await this.getArticles();
    const tagCounts = new Map<string, number>();

    articles.forEach(article => {
      article.metadata.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getArticleNavigation(currentSlug: string): Promise<ArticleNavigation> {
    const articles = await this.getArticles();
    const currentIndex = articles.findIndex(article => article.metadata.slug === currentSlug);

    if (currentIndex === -1) {
      return {};
    }

    const navigation: ArticleNavigation = {};

    // Previous article (newer)
    if (currentIndex > 0) {
      const prevArticle = articles[currentIndex - 1];
      navigation.previous = {
        title: prevArticle.metadata.title,
        slug: prevArticle.metadata.slug
      };
    }

    // Next article (older)
    if (currentIndex < articles.length - 1) {
      const nextArticle = articles[currentIndex + 1];
      navigation.next = {
        title: nextArticle.metadata.title,
        slug: nextArticle.metadata.slug
      };
    }

    return navigation;
  }

  async getRecentArticles(limit: number = 5): Promise<ArticleListItem[]> {
    const articles = await this.getArticlesList();
    return articles.slice(0, limit);
  }

  async getBlogSettings(): Promise<BlogSettings> {
    const [allTags, recentArticles] = await Promise.all([
      this.getAllTags(),
      this.getRecentArticles()
    ]);

    return {
      config: this.config,
      allTags,
      recentArticles
    };
  }

  formatDate(dateString: string): string {
    return format(new Date(dateString), this.config.dateFormat);
  }

  // Force reload articles (useful for development)
  async reloadArticles(): Promise<void> {
    this.articles = [];
    await this.loadArticles();
  }
}

// Singleton instance
export const articlesService = new ArticlesService();
