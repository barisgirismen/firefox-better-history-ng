import Moment from 'moment';

function capitalize(word: string) {
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

export default class HistoryApi {
  /**
   * Return a Promise containing the visits of a day, most recent first
   */
  static async getDayVisits(today: Date, repeatedVisits: boolean) {
    const todayStart = Moment(today).startOf('day').toDate();
    const todayEnd = Moment(today).endOf('day').toDate();

    let historyItems = await browser.history.search({
      text: '',
      startTime: todayStart,
      endTime: todayEnd,
      maxResults: Number.MAX_SAFE_INTEGER,
    });

    const allHistoryItems: browser.history.HistoryItem[] = []; // multi-visits separated
    for (const historyItem of historyItems) {
      if (!historyItem.url) continue;
      let visits = await browser.history.getVisits({ url: historyItem.url });

      if (repeatedVisits) {
        // add all separately visits
        for (const visit of visits) {
          if (
            visit.visitTime !== undefined &&
            Moment(visit.visitTime).isAfter(todayStart) &&
            Moment(visit.visitTime).isBefore(todayEnd)
          ) {
            // create new HistoryItem's with different lastVisitTime
            var newHistoryItem = {
              title: historyItem.title,
              url: historyItem.url,
              lastVisitTime: visit.visitTime,
              id: visit.id,
            };
            allHistoryItems.push(newHistoryItem);
          }
        }
      } else {
        // add only last visit
        // Look for the latest visit item of this day
        const todayFirstVisit = visits
          .reverse()
          .find((visitItem) => Moment(visitItem.visitTime).isSame(Moment(today), 'day'));

        // Sometimes there aren't any visits (during first load usually)
        if (todayFirstVisit) {
          historyItem.lastVisitTime = todayFirstVisit.visitTime;
        }
      }
    }
    if (repeatedVisits) {
      return [allHistoryItems.sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0))];
    } else {
      return [historyItems.sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0))];
    }
  }

  /**
   */
  static async getWeekVisits(today: Moment.Moment, repeatedVisits: boolean) {
    const dateStart = today.clone().startOf('week').toDate();
    const dateEnd = today.clone().endOf('week').toDate();

    let historyItems = await browser.history.search({
      text: '',
      startTime: dateStart,
      endTime: dateEnd,
      maxResults: Number.MAX_SAFE_INTEGER,
    });

    const daysArray = [[], [], [], [], [], [], []] as browser.history.HistoryItem[][];

    if (repeatedVisits) {
      for (const historyItem of historyItems) {
        if (!historyItem.url) continue;
        let visits = await browser.history.getVisits({ url: historyItem.url });
        // add all separate visits
        for (const visit of visits) {
          if (
            visit.visitTime !== undefined &&
            Moment(visit.visitTime).isAfter(dateStart) &&
            Moment(visit.visitTime).isBefore(dateEnd)
          ) {
            // create new HistoryItem's with different lastVisitTime
            const newHistoryItem = {
              title: historyItem.title,
              url: historyItem.url,
              lastVisitTime: visit.visitTime,
              id: visit.id,
            };
            daysArray[Moment(newHistoryItem.lastVisitTime).weekday()].push(newHistoryItem);
          }
        }
      }
    } else {
      for (const historyItem of historyItems) {
        daysArray[Moment(historyItem.lastVisitTime).weekday()].push(historyItem);
      }
    }

    return daysArray.map((day) => day.sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0)));
  }

  /**
   * @param {Date} today a date used to check the month and year of each visits
   */
  static async getMonthVisits(today: Moment.Moment, repeatedVisits: boolean) {
    const firstDayOfMonth = today.clone().startOf('month');
    const firstDayOfWeekBeforeMonth = firstDayOfMonth.startOf('week');
    // dont use firstDayOfMonth anymore

    const dateStart = firstDayOfWeekBeforeMonth;
    const dateEnd = dateStart.clone().add(34, 'days');

    let historyItems = await browser.history.search({
      text: '',
      startTime: dateStart.toDate(),
      endTime: dateEnd.toDate(),
      maxResults: Number.MAX_SAFE_INTEGER,
    });
    const daysMap = new Map<string, browser.history.HistoryItem[]>();
    for (let i = 0; i < 35; i++) {
      let day = dateStart.clone().add(i, 'days');
      daysMap.set(day.format('YYYYMMDD'), []);
    }

    if (repeatedVisits) {
      for (const historyItem of historyItems) {
        if (!historyItem.url) continue;
        let visits = await browser.history.getVisits({ url: historyItem.url });
        // add all separate visits
        for (const visit of visits) {
          const dayKey = Moment(visit.visitTime).format('YYYYMMDD');
          if (visit.visitTime !== undefined && daysMap.has(dayKey)) {
            // create new HistoryItem's with different lastVisitTime
            const newHistoryItem = {
              title: historyItem.title,
              url: historyItem.url,
              lastVisitTime: visit.visitTime,
              id: visit.id,
            };
            daysMap.get(dayKey)!.push(newHistoryItem);
          }
        }
      }
    } else {
      for (const historyItem of historyItems) {
        daysMap.get(Moment(historyItem.lastVisitTime).format('YYYYMMDD'))!.push(historyItem);
      }
    }

    return [...daysMap.values()].map((day) => day.sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0)));
  }

  static formatDayHeader(date: Moment.Moment) {
    const day_number = date.format('Do');
    const month = date.format('MMMM');
    const year = date.format('YYYY');

    return `${day_number} ${capitalize(month)} ${year}`;
  }

  static formatWeekHeader(date: Moment.Moment) {
    const week = 'Week';
    const week_number = date.format('w');
    const year = date.format('YYYY');
    return `${week} ${week_number}, ${year}`;
  }

  static formatMonthHeader(date: Moment.Moment) {
    const month = date.format('MMMM');
    const year = date.format('YYYY');

    return `${capitalize(month)} ${year}`;
  }

  static formatHistoryItem(date: Moment.Moment) {
    const day = date.format('dddd');
    const day_number = date.format('Do');
    const month = date.format('MMMM');

    return `${capitalize(day)} ${day_number} ${capitalize(month)}`;
  }
}
