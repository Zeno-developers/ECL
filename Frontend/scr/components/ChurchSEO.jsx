// src/components/ChurchSEO.jsx
import { Helmet } from 'react-helmet-async'
import { getCachedChurchSettings } from '../utils/churchSettings'

const ChurchSEO = ({ 
  title = "Eternal Love Church | Spirit-Filled Church in Mtubatuba",
  description = "A Spirit-filled, prophetic church in Mtubatuba, built upon apostles and prophets. Led by Apostle Vangeli Sibisi & Prophetess Nokwanda Sibisi. We love God and love people.",
  canonical = "https://elchurch.site",
  image = "/images/logo.png",
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
  serviceTimes = [],
  noindex = false,
  nofollow = false
}) => {

  const settings = getCachedChurchSettings() || {}

  const siteTitle = settings.name || "Eternal Love Church"
  const phone = settings.phone || "0727641137"
  const email = settings.email || "info@elchurch.site"

  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`
  const fullImageUrl = image.startsWith('http') ? image : `https://elchurch.site${image}`

  // Default service times
  const defaultServiceTimes = [
    "Sunday 09:30-12:00",
    "Wednesday 18:00-19:30"
  ]

  const serviceHours = serviceTimes.length > 0 
    ? serviceTimes.map(st => `${st.day} ${st.time}`)
    : defaultServiceTimes

  // Core beliefs description
  const coreBeliefsDescription = "Love is the foundation for all spiritual gifts. A Christian's identity is shaped by love — not by talents or abilities."

  // Founding date
  const foundingDate = "2019-07-07"

  // =========================
  // STRUCTURED DATA
  // =========================
  const churchStructuredData = {
    "@context": "https://schema.org",
    "@type": "Church",
    "name": siteTitle,
    "alternateName": "ELC",
    "description": `${description} ${coreBeliefsDescription}`,
    "url": canonical,
    "logo": fullImageUrl,
    "telephone": phone,
    "email": email,

    "address": {
      "@type": "PostalAddress",
      "streetAddress": "A3313 Rd 3935, Nkodibe",
      "addressLocality": "Mtubatuba",
      "addressRegion": "KwaZulu-Natal",
      "postalCode": "3935",
      "addressCountry": "ZA"
    },

    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "-28.450138",
      "longitude": "32.136433"
    },

    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": "09:30",
        "closes": "12:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Wednesday",
        "opens": "18:00",
        "closes": "19:30"
      }
    ],

    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Pastoral Care",
      "telephone": phone,
      "email": email,
      "areaServed": "ZA",
      "availableLanguage": ["English", "isiZulu"]
    },

    "sameAs": [
      "https://web.facebook.com/people/Eternal-Love-Church/100066667994061",
      "https://youtube.com/eternallovechurch",
      "https://www.instagram.com/eternallovechurch"
    ],

    // ✅ LEADERSHIP (consistent with About section)
    "founder": [
      {
        "@type": "Person",
        "name": "Apostle Vangeli Sibisi"
      },
      {
        "@type": "Person",
        "name": "Prophetess Nokwanda Sibisi"
      }
    ],

    // ✅ FOUNDING DATE (7 July 2019)
    "foundingDate": foundingDate,

    // ✅ KEY EVENTS
    "event": {
      "@type": "Event",
      "name": "Emerge Apostolic Conference",
      "description": "Annual conference focusing on emerging and manifesting one's divine purpose through faith and prophetic revelation.",
      "eventSchedule": {
        "@type": "Schedule",
        "repeatFrequency": "P1Y",
        "scheduleTimezone": "Africa/Johannesburg"
      }
    },

   
    "creator": {
      "@type": "Person",
      "name": "Yamukelani Ntimbane",
      "jobTitle": "Software Developer"
    },

    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": "-28.450138",
        "longitude": "32.136433"
      },
      "geoRadius": "20000"
    },

    "keywords": "Eternal Love Church, Mtubatuba church, Spirit-filled church, apostolic church, prophetic ministry, Emerge Conference"
  }

  // =========================
  // ARTICLE STRUCTURED DATA
  // =========================
  const articleStructuredData = type === "article" ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": fullTitle,
    "description": description,
    "image": fullImageUrl,
    "datePublished": publishedTime,
    "dateModified": modifiedTime || publishedTime,

    "author": {
      "@type": "Person",
      "name": author || "Yamukelani Ntimbane"
    },

    "publisher": {
      "@type": "Organization",
      "name": siteTitle,
      "logo": {
        "@type": "ImageObject",
        "url": fullImageUrl
      }
    },

    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonical
    },

    "articleSection": section,
    "keywords": tags
  } : null

  // =========================
  // ROBOTS
  // =========================
  const robotsContent = []
  if (noindex) robotsContent.push('noindex')
  if (nofollow) robotsContent.push('nofollow')
  if (robotsContent.length === 0) robotsContent.push('index, follow')

  return (
    <Helmet>

      {/* BASIC */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robotsContent.join(', ')} />

      {/* 🔥 YOUR CREDIT */}
      <meta name="author" content="Yamukelani Ntimbane" />
      <meta name="creator" content="Yamukelani Ntimbane" />

      {/* KEYWORDS */}
      <meta name="keywords" content="Eternal Love Church, church Mtubatuba, Christian church South Africa, worship service, Bible study, prayer meeting, KwaZulu-Natal church, Nkodibe church, Apostle Vangeli Sibisi, Prophetess Nokwanda Sibisi, Emerge Conference" />

      {/* OPEN GRAPH */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="en_ZA" />
      <meta property="og:email" content={email} />
      <meta property="og:phone_number" content={phone} />

      {/* TWITTER */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* GEO */}
      <meta name="geo.region" content="ZA-KZN" />
      <meta name="geo.placename" content="Mtubatuba, Nkodibe" />
      <meta name="geo.position" content="-28.450138;32.136433" />
      <meta name="ICBM" content="-28.450138, 32.136433" />

      {/* ARTICLE META */}
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

      {/* STRUCTURED DATA */}
      <script type="application/ld+json">
        {JSON.stringify(churchStructuredData, null, 2)}
      </script>

      {articleStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(articleStructuredData, null, 2)}
        </script>
      )}

      {/* PERFORMANCE */}
      <link rel="preload" href={fullImageUrl} as="image" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

    </Helmet>
  )
}

export default ChurchSEO