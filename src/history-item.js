import Icon from './icon';
import React from 'react';

const getLastVisit = (visit) =>
  'Last visit: ' + new Date(visit.lastVisitTime).toLocaleString(window.ihatereactngbetterhistoyregion);
const getTitle = (visit) => (visit.title != null && visit.title !== '' ? visit.title : visit.url);

export const History = ({ visits, day = false }) => (
  <div>
    {visits.map((visit) => (
      <div className="history-item">
        {day ? (
          <span className="history-item-date">
            {new Date(visit.lastVisitTime).toLocaleTimeString(window.ihatereactngbetterhistoyregion)}
          </span>
        ) : (
          ''
        )}

        <div className="history-item-icon">
          <Icon className="img-icon" default="globe" faviconUrl={visit.url} />
        </div>

        <span className="history-item-url ellipsis-text">
          <abbr title={getLastVisit(visit) + '; ' + getTitle(visit)}>{getTitle(visit)}</abbr>
        </span>
        <div className="history-item-link">
          <a href={visit.url} title={visit.url} target="_blank" rel="noopener noreferrer">
            {day ? 'Link' : ''}
          </a>
        </div>
      </div>
    ))}
  </div>
);
