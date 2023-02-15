import Moment from 'moment';

function capitalize(word: string) {
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

async function search(start: Date, end: Date) {
  return await browser.history.search({
    text: '',
    startTime: start,
    endTime: end,
    maxResults: Number.MAX_SAFE_INTEGER,
  });
}
function getMap(start: Date, count: number) {
  const daysMap = new Map<string, browser.history.HistoryItem[]>();
  for (let i = 0; i < count; i++) {
    let day = Moment(start).clone().add(i, 'days');
    daysMap.set(day.format('YYYYMMDD'), []);
  }
  return daysMap;
}
function convertMap(map: Map<string, browser.history.HistoryItem[]>) {
  return [...map.values()].map((day) => day.sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0)));
}

function addEntries(daysMap: Map<string, browser.history.HistoryItem[]>, historyItems: browser.history.HistoryItem[]) {
  for (const historyItem of historyItems) {
    daysMap.get(Moment(historyItem.lastVisitTime).format('YYYYMMDD'))!.push(historyItem);
  }
}
async function addEachVisitToDayMap(
  daysMap: Map<string, browser.history.HistoryItem[]>,
  historyItems: browser.history.HistoryItem[]
) {
  for (const historyItem of historyItems) {
    if (!historyItem.url) continue;
    let visits = await browser.history.getVisits({ url: historyItem.url });
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
}

async function getItems(start: Date, end: Date, daysToMap: number, repeatedVisits: boolean) {
  let historyItems = await search(start, end);
  const daysMap = getMap(start, daysToMap);
  if (repeatedVisits) {
    await addEachVisitToDayMap(daysMap, historyItems);
  } else {
    addEntries(daysMap, historyItems);
  }
  return convertMap(daysMap);
}
export default class HistoryApi {
  static async getDayVisits(today: Date, repeatedVisits: boolean) {
    const dateStart = Moment(today).startOf('day').toDate();
    const dateEnd = Moment(today).endOf('day').toDate();
    return await getItems(dateStart, dateEnd, 1, repeatedVisits);
  }

  static async getWeekVisits(today: Moment.Moment, repeatedVisits: boolean) {
    const dateStart = today.clone().startOf('week').toDate();
    const dateEnd = today.clone().endOf('week').toDate();
    return await getItems(dateStart, dateEnd, 7, repeatedVisits);
  }

  static async getMonthVisits(today: Moment.Moment, repeatedVisits: boolean) {
    const firstDayOfMonth = today.clone().startOf('month');
    const dateStart = firstDayOfMonth.startOf('week');
    const dateEnd = dateStart.clone().add(34, 'days').toDate();
    return await getItems(dateStart.toDate(), dateEnd, 35, repeatedVisits);
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
