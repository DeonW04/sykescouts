import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title = '40th Rochdale (Syke) Scouts | Adventure, Skills & Fun for Young People',
  description = 'Join 40th Rochdale (Syke) Scouts for exciting adventures, skill-building activities, and lifelong friendships. Beavers, Cubs, and Scouts sections for ages 6-14 in Rochdale.',
  keywords = 'scouts, rochdale, syke, beavers, cubs, scouts, youth activities, youth group, children activities, outdoor activities, badges, camping',
  ogImage = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png',
  path = ''
}) {
  const siteUrl = window.location.origin;
  const fullUrl = `${siteUrl}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional SEO */}
      <link rel="canonical" href={fullUrl} />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
    </Helmet>
  );
}