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
                backgroundColor: 'transparent',
                boxShadow: 'none',
                ':focus': {
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }
              }}
            />
          </div>

          {/* Enhanced color picker dialog with dark theme */}
          {this.state.editingTerm && (
            <>
              {/* Improved overlay with blur effect */}
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 999
                }}
                onClick={() => this.setState({ editingTerm: null, tempColor: null })}
              />
              
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#1a1a1a',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                zIndex: 1000,
                width: '320px',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#ffffff'
                    }}>Edit Color</h3>
                    <button 
                      onClick={() => this.setState({ editingTerm: null, tempColor: null })}
                      style={{
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '8px',
                        color: '#ffffff',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    >
                      ×
                    </button>
                  </div>

                  {/* Current term display */}
                  <div style={{
                    background: 'linear-gradient(to right bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#999',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      Current term:
                    </div>
                    <span style={{
                      backgroundColor: searchTerms.find(t => t.term === this.state.editingTerm)?.color + '33',
                      border: `1px solid ${searchTerms.find(t => t.term === this.state.editingTerm)?.color}`,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#ffffff',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {this.state.editingTerm}
                    </span>
                  </div>

                  {/* Color picker section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <label 
                      htmlFor="colorPicker"
                      style={{
                        fontSize: '13px',
                        color: '#999',
                        fontWeight: '500'
                      }}
                    >
                      Select a new color:
                    </label>
                    <input
                      id="colorPicker"
                      type="color"
                      value={this.state.tempColor || searchTerms.find(t => t.term === this.state.editingTerm)?.color || '#000000'}
                      onChange={(e) => {
                        this.setState({ tempColor: e.target.value });
                      }}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '4px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: '#2d2d2d'
                      }}
                    />
                  </div>

                  {/* Preview section */}
                  <div style={{
                    background: 'linear-gradient(to right bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#999',
                      marginBottom: '12px',
                      fontWeight: '500'
                    }}>
                      Preview
                    </div>
                    <div style={{
                      backgroundColor: (this.state.tempColor || searchTerms.find(t => t.term === this.state.editingTerm)?.color) + '33',
                      border: `1px solid ${this.state.tempColor || searchTerms.find(t => t.term === this.state.editingTerm)?.color}`,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#ffffff'
                    }}>
                      Sample text with selected color
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '4px'
                  }}>
                    <button
                      onClick={() => this.setState({ editingTerm: null, tempColor: null })}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ffffff',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
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
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </>
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