import React from 'react';
import { History } from './history-item';

const NoHistory = () => <div className="history-item">Empty</div>;

const DayView = ({ visits }) => (
  <div className="history-day-container">
    {!visits || !visits.length || !visits[0].length ? <NoHistory /> : <History visits={visits[0]} />}
  </div>
);

export default DayView;
