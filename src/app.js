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
      search: '',
      visits: [],
      repeatedVisits,
      searchTerms: [], // Array of {term, color} objects
    };
  }

  onInputChange(event) {
    this.setState({ search: event.target.value });
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
    const { searchTerms, visits } = this.state;

    if (!searchTerms.length) {
      return visits;
    }

    let hostname_filters = [];
    // Extract site: filters from search terms
    const terms = searchTerms.filter(({ term }) => {
      if (term.startsWith('site:')) {
        hostname_filters.push(term.substring(5));
        return false;
      }
      return true;
    });

    const filteredVisits = [];

    for (const visitsArray of visits) {
      filteredVisits.push(
        visitsArray.filter((visit) => {
          // Check if any search term matches
          const matchingTerms = terms.filter(({ term, color }) => {
            const needle = term.toUpperCase();
            return (visit.url.toUpperCase().includes(needle) ||
              (visit.title != null && visit.title.toUpperCase().includes(needle))) ? 
              { term, color } : false;
          });

          if (!matchingTerms.length && terms.length > 0) {
            return false;
          }

          // Add matching terms and their colors to the visit object
          visit.matchingTerms = matchingTerms;

          // Check hostname filters
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

  addSearchTerm(term, color) {
    const { searchTerms } = this.state;
    if (!searchTerms.find(t => t.term === term)) {
      this.setState({
        searchTerms: [...searchTerms, { term, color }],
        search: '' // Clear input after adding term
      });
    }
  }

  removeSearchTerm(termToRemove) {
    const { searchTerms } = this.state;
    this.setState({
      searchTerms: searchTerms.filter(({ term }) => term !== termToRemove)
    });
  }

  render() {
    const { currentView, date, loading, search, repeatedVisits, searchTerms } = this.state;

    let filteredVisits = [];
    if (loading) {
      if (currentView === VIEWS.DAY) {
        HistoryApi.getDayVisits(date, repeatedVisits).then((newVisits) => {
          this.setState({ loading: false, visits: newVisits });
        });
      } else if (currentView === VIEWS.WEEK) {
        HistoryApi.getWeekVisits(date, repeatedVisits).then((newVisits) => {
          this.setState({ loading: false, visits: newVisits });
        });
      } else if (currentView === VIEWS.MONTH) {
        HistoryApi.getMonthVisits(date, repeatedVisits).then((newVisits) => {
          this.setState({ loading: false, visits: newVisits });
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

    return (
      <div className="container">
        <div className="toolbar">
          <h1>{selectedDate}</h1>

          <div className="search-wrapper" style={{ 
            position: 'relative',
            padding: '4px',
            background: '#fff',
            borderRadius: '4px',
            border: '1px solid #ccc',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px',
            minHeight: '36px'
          }}>
            {searchTerms.map(({ term, color }) => (
              <span 
                key={term} 
                style={{ 
                  backgroundColor: color + '33',
                  border: `1px solid ${color}`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  maxHeight: '24px'
                }}
              >
                {term}
                <button 
                  onClick={() => this.removeSearchTerm(term)}
                  style={{ 
                    marginLeft: '4px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '0 4px',
                    color: '#666',
                    fontSize: '14px'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="default-input search-input"
              type="text"
              value={search}
              onChange={this.onInputChange.bind(this)}
              placeholder={searchTerms.length === 0 ? "Search a website" : ""}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search && search.trim()) {
                  const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
                  this.addSearchTerm(search.trim(), color);
                }
              }}
              style={{
                border: 'none',
                outline: 'none',
                padding: '4px',
                flex: '1',
                minWidth: '100px',
                fontSize: '14px',
                backgroundColor: 'transparent'
              }}
            />
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