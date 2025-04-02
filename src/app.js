import React from 'react';
import Moment from 'moment';
import HistoryApi from 'history-api';

import DayView from 'day-view';
import WeekView from 'week-view';
import MonthView from 'month-view';
import Icon from 'icon';

const VIEWS = {
  DAY: 0,
  WEEK: 1,
  MONTH: 2,
};

const VIEW_UNITS = ['days', 'weeks', 'months'];

class App extends React.Component {
  constructor(props) {
    super(props);

    let currentView = props.defaultView;
    if (currentView === null || currentView === undefined) {
      currentView = VIEWS.WEEK;
    }

    let repeatedVisits = props.repeatedVisits;
    if (repeatedVisits === null || repeatedVisits === undefined) {
      repeatedVisits = false;
    }

    this.state = {
      currentView,
      date: Moment(),
      loading: true,
      search: null,
      visits: [],
      repeatedVisits,
    };
  }

  toggleRepeatedVisits() {
    browser.storage.local.set({ repeatedVisits: !this.state.repeatedVisits });
    this.setState({ repeatedVisits: !this.state.repeatedVisits, loading: true });
  }

  setView(newView) {
    browser.storage.local.set({ last_visited: newView });
    this.setState({ currentView: newView, date: Moment(), loading: true });
  }

  previous() {
    const { currentView, date } = this.state;
    date.subtract(1, VIEW_UNITS[currentView]);
    this.setState({ date, loading: true });
  }

  next() {
    const { currentView, date } = this.state;
    date.add(1, VIEW_UNITS[currentView]);
    this.setState({ date, loading: true });
  }

  viewDay(targetDate) {
    this.setView(VIEWS.DAY);
    this.setState({ date: targetDate, loading: true });
  }

  getFilteredVisits() {
    const { search, visits } = this.state;

    if (!search || search.trim() === '') {
      return visits;
    }

    let hostname_filters = [];
    // Split the search into individual terms, preserving quoted phrases
    let terms = search.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    
    // Handle site: filters
    terms = terms.filter(term => {
      if (term.startsWith('site:')) {
        hostname_filters.push(term.substring(5).replace(/"/g, ''));
        return false;
      }
      return true;
    });

    // Remove quotes from remaining terms
    terms = terms.map(term => term.replace(/"/g, ''));

    const filteredVisits = [];

    for (const visitsArray of visits) {
      filteredVisits.push(
        visitsArray.filter((visit) => {
          // First check if any search term matches (OR condition)
          const matchesAnyTerm = terms.length === 0 || terms.some(term => {
            const needle = term.toUpperCase();
            return visit.url.toUpperCase().includes(needle) ||
              (visit.title != null && visit.title.toUpperCase().includes(needle));
          });

          if (!matchesAnyTerm) {
            return false;
          }

          // Then check hostname filters if any
          if (hostname_filters.length === 0) {
            return true;
          }

          const url = new URL(visit.url);
          return hostname_filters.some(hostname => 
            url.hostname.toUpperCase().endsWith(hostname.toUpperCase())
          );
        })
      );
    }

    return filteredVisits;
  }

  onInputChange(event) {
    const search = event.target.value;
    this.setState({ search });
  }

  render() {
    const { currentView, date, loading, search, repeatedVisits } = this.state;

    let filteredVisits = [];
    if (loading) {
      if (currentView === VIEWS.DAY) {
        HistoryApi.getDayVisits(date, repeatedVisits).then((newVisits) => {
          this.setState({ loading: false, visits: newVisits, filteredVisits: newVisits });
        });
      } else if (currentView === VIEWS.WEEK) {
        HistoryApi.getWeekVisits(date, repeatedVisits).then((newVisits) => {
          this.setState({ loading: false, visits: newVisits, filteredVisits: newVisits });
        });
      } else if (currentView === VIEWS.MONTH) {
        HistoryApi.getMonthVisits(date, repeatedVisits).then((newVisits) => {
          this.setState({ loading: false, visits: newVisits, filteredVisits: newVisits });
        });
      }
    } else {
      filteredVisits = this.getFilteredVisits();
    }

    let selectedDate =
      currentView === VIEWS.DAY
        ? HistoryApi.formatDayHeader(date)
        : currentView === VIEWS.WEEK
        ? HistoryApi.formatWeekHeader(date)
        : HistoryApi.formatMonthHeader(date);

    let clearButtonClasses = 'search-button search-button--cancel';
    if (!search) {
      clearButtonClasses += ' hidden';
    }

    return (
      <div className="container">
        <div className="toolbar">
          <h1>{selectedDate}</h1>

          <div className="search-wrapper">
            <input
              className="default-input search-input"
              type="text"
              value={search}
              onChange={this.onInputChange.bind(this)}
              placeholder="Search a website"
            />
            <button className={clearButtonClasses} onClick={() => this.setState({ search: '' })} title="Clear" />
          </div>

          <button className="toolbar-item-right ghost-button align-right" onClick={() => this.previous()}>
            <Icon default="back" />
          </button>
          <button className="toolbar-item-right ghost-button" onClick={() => this.next()}>
            <Icon default="forward" />
          </button>
          {repeatedVisits ? (
            <button
              className="toolbar-item-right ghost-button"
              title="Hide Repeated Visits"
              onClick={() => this.toggleRepeatedVisits()}
            >
              <Icon default="multiple" />
            </button>
          ) : (
            <button
              className="toolbar-item-right ghost-button"
              title="Show Repeated Visits"
              onClick={() => this.toggleRepeatedVisits()}
            >
              <Icon default="multiple-disabled" />
            </button>
          )}
          <button className="toolbar-item-right default-button" onClick={() => this.setView(VIEWS.DAY)}>
            Day
          </button>
          <button className="toolbar-item-right default-button" onClick={() => this.setView(VIEWS.WEEK)}>
            Week
          </button>
          <button className="toolbar-item-right default-button" onClick={() => this.setView(VIEWS.MONTH)}>
            Month
          </button>
        </div>

        {loading ? (
          <div className="spinner"></div>
        ) : currentView === VIEWS.DAY ? (
          <DayView visits={filteredVisits} />
        ) : currentView === VIEWS.WEEK ? (
          <WeekView date={date} visits={filteredVisits} viewDay={this.viewDay.bind(this)} />
        ) : (
          <MonthView date={date} visits={filteredVisits} viewDay={this.viewDay.bind(this)} />
        )}
      </div>
    );
  }
}

export default App;
