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
      searchTerms: [], // Array of {term, color, exclude} objects
      editingTerm: null, // For color editing
      tempColor: null, // For color preview
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

  addSearchTerm(term, color) {
    const { searchTerms } = this.state;
    const isExclude = term.startsWith('-');
    const actualTerm = isExclude ? term.substring(1) : term;
    
    if (!searchTerms.find(t => t.term === actualTerm)) {
      this.setState({
        searchTerms: [...searchTerms, { 
          term: actualTerm, 
          color, 
          exclude: isExclude 
        }],
        search: ''
      });
    }
  }

  updateTermColor(term, newColor) {
    const { searchTerms } = this.state;
    this.setState({
      searchTerms: searchTerms.map(t => 
        t.term === term ? { ...t, color: newColor } : t
      ),
      editingTerm: null
    });
  }

  getFilteredVisits() {
    const { searchTerms, visits } = this.state;

    if (!searchTerms.length) {
      return visits;
    }

    let hostname_filters = [];
    // Split terms into include and exclude
    const includeTerms = [];
    const excludeTerms = [];
    
    searchTerms.forEach(term => {
      if (term.term.startsWith('site:')) {
        hostname_filters.push(term.term.substring(5));
      } else if (term.exclude) {
        excludeTerms.push(term);
      } else {
        includeTerms.push(term);
      }
    });

    const filteredVisits = [];

    for (const visitsArray of visits) {
      filteredVisits.push(
        visitsArray.filter((visit) => {
          // Check excluded terms first
          const hasExcludedTerm = excludeTerms.some(({ term }) => {
            const needle = term.toUpperCase();
            return visit.url.toUpperCase().includes(needle) ||
              (visit.title != null && visit.title.toUpperCase().includes(needle));
          });

          if (hasExcludedTerm) {
            return false;
          }

          // Check included terms
          const matchingTerms = includeTerms.filter(({ term, color }) => {
            const needle = term.toUpperCase();
            return (visit.url.toUpperCase().includes(needle) ||
              (visit.title != null && visit.title.toUpperCase().includes(needle))) ? 
              { term, color } : false;
          });

          if (!matchingTerms.length && includeTerms.length > 0) {
            return false;
          }

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
            borderRadius: '4px',
            border: '1px solid #ccc',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px',
            minHeight: '36px'
          }}>
            {searchTerms.map(({ term, color, exclude }) => (
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
                  maxHeight: '24px',
                  cursor: 'pointer'
                }}
                onClick={() => this.setState({ editingTerm: term })}
              >
                {exclude ? '-' : ''}{term}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    this.removeSearchTerm(term);
                  }}
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
              placeholder={searchTerms.length === 0 ? "Search or use - to exclude terms" : ""}
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

          {/* Improved color picker dialog */}
          {this.state.editingTerm && (
            <div style={{
              position: 'fixed',  // Changed to fixed for better positioning
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 1000,
              width: '300px',
              border: '1px solid #eee'
            }}>
              {/* Overlay for clicking outside to close */}
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: -1
                }}
                onClick={() => this.setState({ editingTerm: null })}
              />
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '500'
                  }}>Edit Color</h3>
                  <button 
                    onClick={() => this.setState({ editingTerm: null })}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#666',
                      width: '32px',
                      height: '32px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px'
                }}>
                  <span style={{
                    backgroundColor: searchTerms.find(t => t.term === this.state.editingTerm)?.color + '33',
                    border: `1px solid ${searchTerms.find(t => t.term === this.state.editingTerm)?.color}`,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '14px'
                  }}>
                    {this.state.editingTerm}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label 
                    htmlFor="colorPicker"
                    style={{
                      fontSize: '14px',
                      color: '#666'
                    }}
                  >
                    Choose a new color:
                  </label>
                  <input
                    id="colorPicker"
                    type="color"
                    value={searchTerms.find(t => t.term === this.state.editingTerm)?.color || '#000000'}
                    onChange={(e) => {
                      // Store the color temporarily without applying
                      this.setState(prevState => ({
                        tempColor: e.target.value
                      }));
                    }}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '4px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                {/* Preview section */}
                <div style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '8px'
                  }}>
                    Preview:
                  </div>
                  <div style={{
                    backgroundColor: (this.state.tempColor || searchTerms.find(t => t.term === this.state.editingTerm)?.color) + '33',
                    border: `1px solid ${this.state.tempColor || searchTerms.find(t => t.term === this.state.editingTerm)?.color}`,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    Sample text with new color
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <button
                    onClick={() => this.setState({ editingTerm: null })}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (this.state.tempColor) {
                        this.updateTermColor(this.state.editingTerm, this.state.tempColor);
                      }
                      this.setState({ tempColor: null });
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#007AFF',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

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