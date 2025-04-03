import Icon from './icon';
import React from 'react';

const getLastVisit = (visit) =>
  'Last visit: ' + new Date(visit.lastVisitTime).toLocaleString(window.ihatereactngbetterhistoryregion);
const getTitle = (visit) => (visit.title != null && visit.title !== '' ? visit.title : visit.url);

const highlightText = (text, matchingTerms) => {
  if (!matchingTerms || !matchingTerms.length) return text;
  return text; // Just return plain text since we're highlighting the whole div
};

// Calculate background color based on matching terms
const getBackgroundColor = (matchingTerms) => {
  if (!matchingTerms || !matchingTerms.length) {
    return 'rgba(255, 255, 255, 0.03)';  // Default background color when no terms match
  }
  
  // If there's only one term, use its color with reduced opacity
  if (matchingTerms.length === 1) {
    return matchingTerms[0].color + '33'; // 20% opacity
  }
  
  // For multiple terms, create a gradient
  const colors = matchingTerms.map(term => term.color + '33').join(', ');
  return `linear-gradient(135deg, ${colors})`;
};

function openTabs(urls) {
  if (urls.length > 5 && !confirm(`This will open ${urls.length} new tabs, continue?`))
    return;
  urls.forEach(url => {
    browser.tabs.create({ url: url });
  });
}

const OpenAllLink = ({visits}) => (
  <a className="openNewTab" title={`Open all ${visits.length} links in new tabs`} href="#" onClick={e => {
    e.stopPropagation();
    openTabs(visits.map((visit) => visit.url));
  }}>{visits.length} Links</a>
)
export const History = ({ visits, day = false }) => (
  <div>
    <OpenAllLink visits={visits} />
    <div>
      {visits.map((visit) => (
        <div 
          className="history-item" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            minHeight: '40px',
            width: '100%',
            boxSizing: 'border-box',
            background: getBackgroundColor(visit.matchingTerms),  // Remove the || condition since getBackgroundColor now always returns a value
            transition: 'all 0.2s ease',
            borderRadius: '8px',
            marginBottom: '4px',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            if (!visit.matchingTerms?.length) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }
          }}
          onMouseLeave={(e) => {
            if (!visit.matchingTerms?.length) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '2px',
            minHeight: '20px',
            width: '100%',
            justifyContent: 'flex-start'
          }}>
            <Icon 
              className="history-item-icon" 
              default="globe" 
              faviconUrl={visit.url} 
              style={{ 
                width: '16px', 
                height: '16px', 
                marginRight: '8px', 
                flexShrink: 0,
                display: 'block'
              }}
            />
            <span className="history-item-url ellipsis-text" style={{ 
              flex: '1 1 auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left',
              color: '#ffffff'  // Added white text color
            }}>
              <abbr title={getTitle(visit)}>
                {getTitle(visit)}
              </abbr>
            </span>
            <div className="history-item-link" style={{ 
              flexShrink: 0,
              marginLeft: 'auto'
            }}>
              <a 
                href={visit.url} 
                title={visit.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#2563eb',  // Blue link color
                  textDecoration: 'none',
                  opacity: 0.9,
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.9'}
              >
                {day ? 'Link' : ''}
              </a>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            fontSize: '0.85em',
            color: 'rgba(255, 255, 255, 0.5)',  // Updated secondary text color
            minHeight: '16px',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}>
            <span className="history-item-date" style={{ 
              flexShrink: 0,
              textAlign: 'left'
            }}>
              {new Date(visit.lastVisitTime).toLocaleTimeString(window.ihatereactngbetterhistoryregion, {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span style={{ 
              marginLeft: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '1 1 auto',
              textAlign: 'left',
              opacity: 0.7
            }}>
              {highlightText(visit.url, visit.matchingTerms)}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);