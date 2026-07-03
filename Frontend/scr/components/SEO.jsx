// src/components/SEO.jsx
import { Helmet } from 'react-helmet-async'
import { getCachedChurchSettings } from '../utils/churchSettings'

const SEO = ({ 
  title = "Eternal Love Church | Christian Church in Mtubatuba",
  description = "Join our Christian community in Mtubatuba for worship, Bible study, and prayer services. Experience God's love and restoration.",
  canonical = "https://elchurch.site",
  image = "https://elchurch.site/images/logo.png",
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = []
}) => {
  const siteTitle = getCachedChurchSettings().name || "Eternal Love Church"
  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`
  const fullImageUrl = image.startsWith('http') ? image : `https://elchurch.site${image}`
  const robotsContent = ['index', 'follow']

  const structuredData = {
    "@context": "https://schema.org",
    "@type": type === "article" ? "Article" : "WebPage",
    "name": fullTitle,
    "description": description,
    "url": canonical,
    "image": fullImageUrl,
    "publisher": {
      "@type": "Organization",
      "name": siteTitle,
      "logo": {
        "@type": "ImageObject",
        "url": "https://elchurch.site/images/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonical
    }
  }

  if (type === "article") {
    structuredData.datePublished = publishedTime
    structuredData.dateModified = modifiedTime
    structuredData.author = {
      "@type": "Person",
      "name": author
    }
    structuredData.articleSection = section
    structuredData.keywords = tags.join(', ')
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent.join(', ')} />
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="en_ZA" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:image:alt" content={`${siteTitle} - ${description.substring(0, 100)}`} />
      
      {/* Article-specific meta tags */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && section && (
        <meta property="article:section" content={section} />
      )}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  )
}

export default SEO

