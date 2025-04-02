import Icon from './icon';
import React from 'react';

const getLastVisit = (visit) =>
  'Last visit: ' + new Date(visit.lastVisitTime).toLocaleString(window.ihatereactngbetterhistoryregion);
const getTitle = (visit) => (visit.title != null && visit.title !== '' ? visit.title : visit.url);

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
        <div className="history-item" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          padding: '4px 8px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          minHeight: '40px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
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
              textAlign: 'left'
            }}>
              <abbr title={getTitle(visit)}>{getTitle(visit)}</abbr>
            </span>
            <div className="history-item-link" style={{ 
              flexShrink: 0,
              marginLeft: 'auto'
            }}>
              <a href={visit.url} title={visit.url} target="_blank" rel="noopener noreferrer">
                {day ? 'Link' : ''}
              </a>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            fontSize: '0.85em',
            color: '#666',
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
              marginLeft: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '1 1 auto',
              textAlign: 'left'
            }}>
              {visit.url}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);