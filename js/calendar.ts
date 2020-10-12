interface Deadline {
    date: moment.Moment;
    title: string;
    expired: boolean;
}

interface DeadlineMap {
    [key: string]: string[];
}

interface Timing {
    title: string;
    time: string;
}

interface Menu {
    mains: string[];
    sides: string[];
    desserts: string[];
}

interface DayData {
    uniform?: string[];
    games?: string[];
    kit?: string[];
    menu?: Menu[];
    timings?: Timing[];
}

interface DayDataMap {
    [key: string]: DayData;
}

interface DateRange {
    start: moment.Moment;
    end: moment.Moment;
}

interface WeekRota {
    start?: moment.Moment;
    frequency?: number;
    monday?: DayData;
    tuesday?: DayData;
    wednesday?: DayData;
    thursday?: DayData;
    friday?: DayData;
    saturday?: DayData;
    sunday?: DayData;
}

interface WeekRotaMap {
    [key: string]: WeekRota;
}

interface DataGroup {
    rota: WeekRotaMap;
    extras: DayDataMap;
    overrides: DayDataMap;
    deadlines: DeadlineMap;
}

interface DataGroupMap {
    [key: string]: DataGroup;
}

interface Data {
    yeargroup: DataGroup;
    classes: DataGroupMap;
    termTimes: DateRange[];
}


class CalendarModel {
    private _currentDate: moment.Moment;
    private _data: Data;
    private readonly _context: string;
    public currentClass: string;

    constructor(data: Data, context: string) {
        this.currentDate = moment();
        this._data = data;
        this._context = context;
    }

    get classNames(): Array<string> {
        return Object.keys(this._data.classes);
    }

    get currentDate(): moment.Moment {
        return this._currentDate;
    }

    set currentDate(date: moment.Moment) {
        this._currentDate = date.startOf('isoWeek');
    }

    get classPickKey(): string {
        return this._context ? 'pick-class-' + this._context : 'pick-class'
    }

    private optional(stack: string[], def: any): any {
        let cursor = this._data;

        for (let i = 0; i < stack.length; ++i) {
            cursor = cursor[stack[i]];
            if (cursor === undefined) {
                return def;
            }
        }

        return cursor;
    }

    currentRota(): WeekRota {
        const yearRota = this.getRotaForWeek(this.optional(['yeargroup', 'rota'], {})) || {};
        const classRota = this.getRotaForWeek(this.optional(['classes', this.currentClass, 'rota'], {})) || {};
        return {
            monday: CalendarModel.merge(classRota['monday'], yearRota['monday']),
            tuesday: CalendarModel.merge(classRota['tuesday'], yearRota['tuesday']),
            wednesday: CalendarModel.merge(classRota['wednesday'], yearRota['wednesday']),
            thursday: CalendarModel.merge(classRota['thursday'], yearRota['thursday']),
            friday: CalendarModel.merge(classRota['friday'], yearRota['friday']),
            saturday: {},
            sunday: {}
        };
    }

    private getRotaForWeek(rotas: WeekRotaMap): WeekRota {
        for (let key of Object.keys(rotas)) {
            const rota = rotas[key];
            if (this.isRotaForWeek(rota)) {
                return rota;
            }
        }
        return undefined;
    }

    private extras(date: moment.Moment): DayData {
        return this.mergeForKey(date, 'extras');
    }


    private overrides(date: moment.Moment): DayData {
        return this.mergeForKey(date, 'overrides');
    }

    private mergeForKey(date: moment.Moment, key: string) {
        const dkey = date.format('YYYY-MM-DD');
        const year = this.optional(['yeargroup', key, dkey], {});
        const clas = this.optional(['classes', this.currentClass, key, dkey], {});
        return CalendarModel.merge(clas, year);
    }

    isTermTime(date: moment.Moment): boolean {
        return this._data.termTimes.find(o => CalendarModel.containsDate(o, date)) !== undefined;
    }

    isHoliday(date: moment.Moment): boolean {
        return !this.isTermTime(date);
    }

    kit(date: moment.Moment): string[] {
        return this.arrayJoin(date, 'kit');
    }

    uniform(date: moment.Moment): string[] {
        return this.arrayJoin(date, 'uniform');
    }

    games(date: moment.Moment): string[] {
        return this.arrayJoin(date, 'games');
    }

    timings(date: moment.Moment): Timing[] {
        const overrides: Timing[] = CalendarModel.value(this.overrides(date), 'timings', [])
            .map(o => { return  { title: CalendarModel.markup(o.title, '*'), time: o.time} });
        const extra: Timing[] = CalendarModel.value(this.extras(date), 'timings', [])
            .map(o => { return  { title: CalendarModel.markup(o.title, '+'), time: o.time} });
        const rota: Timing[] = CalendarModel.dayValue(this.currentRota(), date, 'timings', []);
        return (overrides.length ? overrides : extra.concat(rota))
            .sort(CalendarModel.sortTime);
    }

    private static markup(value: string, symbol: string) {
        if (value !== undefined && (value.startsWith("*") || value.startsWith("+"))) {
            value = value.substring(1, value.length);
        }

        return symbol + value;
    }

    private static sortTime(l:Timing, r:Timing) {
        if (l.time.endsWith('am') && r.time.endsWith('pm')) {
            return -1;
        }
        if (l.time.endsWith('pm') && r.time.endsWith('am')) {
            return 1;
        }

        const lt = l.time.split(':');
        const rt = r.time.split(':');

        const hour = (parseInt(lt[0]) || 0) - (parseInt(rt[0]) || 0);
        if (hour != 0) {
            return hour;
        }

        const min = (lt.length > 1 ? parseInt(lt[1]) : 0) - (rt.length > 0 ? parseInt(rt[1]) : 0);
        if (min != 0) {
            return min;
        }

        return l.title.localeCompare(r.title);
    }

    private arrayJoin(date: moment.Moment, key: string) {
        const overrides: string[] = CalendarModel.value(this.overrides(date), key, [])
            .map(o => CalendarModel.markup(o, '*'));
        const extra: string[] = CalendarModel.value(this.extras(date), key, [])
            .map(o => CalendarModel.markup(o, '+'));
        const rota: string[] = CalendarModel.dayValue(this.currentRota(), date, key, []);
        return overrides.length ? overrides : extra.concat(rota);
    }

    // private stringJoin(date: moment.Moment, key: string) {
    //     const overrides: string = CalendarModel.value(this.overrides(date), key, '');
    //     const extra: string = CalendarModel.value(this.extras(date), key, null);
    //     const rota: string = CalendarModel.dayValue(this.currentRota(), date, key, null);
    //     return overrides && overrides.length
    //         ? '*' + CalendarModel.flat([overrides]).join(", ")
    //         : CalendarModel.flat([extra, rota].filter(o => o && o.length)).join(", ");
    // }

    static dayValue(info: WeekRota, date: moment.Moment, key: string, def: any): any {
        return info
            ? CalendarModel.value(info[date.format('dddd').toLowerCase()], key, [])
            : def;
    }

    static value(info: DayData, key: string, def: any): any {
        return info && info[key] ? info[key] : def;
    }

    static flat(arr :any[]): any[] {
        return arr.reduce((acc, val) => acc.concat(val), []);
    }

    private static merge(primary: DayData, secondary: DayData) {
        return {
            uniform: CalendarModel.concatKey(primary, secondary, 'uniform'),
            games: CalendarModel.concatKey(primary, secondary, 'games'),
            kit: CalendarModel.concatKey(primary, secondary, 'kit'),
            timings: CalendarModel.concatKey(primary, secondary, 'timings'),
            menu: CalendarModel.concatKey(primary, secondary, 'menu')
        }
    }

    private static concatKey(first: any, second: any, key: string) {
        const a = first && first[key] ? CalendarModel.flat([first[key]]) : [];
        const b = second && second[key] ? CalendarModel.flat([second[key]]) : [];
        return a.concat(b);
    }

    recentOrFutureDeadlines(): Deadline[] {
        const recent = this.deadlineForList(this.optional(['yeargroup', 'deadlines'], undefined))
            .concat(this.deadlineForList(this.optional(['classes', this.currentClass, 'deadlines'], undefined)));
        return recent.sort((l, r) => {
            return l.date.diff(r.date, 'day');
        });
    }

    deadlines(date: moment.Moment): string[] {
        const dkey = date.format('YYYY-MM-DD');
        return this.optional(['yeargroup', 'deadlines', dkey], [])
            .concat(this.optional(['classes', this.currentClass, 'deadlines', dkey], []))
            .map(o => '!' + o);
    }

    hasData(date: moment.Moment) {
        return this.uniform(date).length > 0
            || this.games(date).length > 0
            || this.kit(date).length > 0
            || this.timings(date).length > 0;
    }

    private deadlineForList(deadlines: DeadlineMap): Deadline[] {
        if (deadlines === undefined) {
            return [];
        }

        let list = [];
        const today = moment().startOf('day');
        const after = moment(today).subtract(1, 'week');
        for (let key of Object.keys(deadlines)) {
            let date = moment(key);
            if (date.isBefore(after)) {
                continue;
            }
            let values = deadlines[key];
            list = list.concat(values.map((t) => { return {
                date: date,
                title: t,
                expired: date.isBefore(today)
            }}));
        }

        return list;
    }

    private static containsDate(range: DateRange, date: moment.Moment): boolean {
        return date.isBetween(range.start, range.end, 'day', '[]');
    }

    private isRotaForWeek(rota: WeekRota): boolean {
        const weeks = this.currentDate.diff(rota.start, "week");
        return weeks >= 0 && weeks % rota.frequency === 0;
    }
}

class Calendar {
    model: CalendarModel;
    classPicker: JQuery<HTMLElement>;

    constructor(data: Data, context: string) {
        this.model = new CalendarModel(data, context);
        this.classPicker = $('.class-pick');
        this.init();
    }

    get pickedClass(): string {
        try {
            const cls = localStorage.getItem(this.model.classPickKey);
            return !cls ? $($('.class-pick a')[0]).data('class') : cls;
        } catch (e) {
            return $($('.class-pick a')[0]).data('class');
        }
    }

    set pickedClass(cls: string) {
        this.model.currentClass = cls;
        try {
            localStorage.setItem(this.model.classPickKey, cls);
        } catch (err) {
        }
        this.repaint();
    }

    set currentDate(date: moment.Moment) {
        this.model.currentDate = date;
        this.repaint();
        this.scrollBest();
    }

    paint(): void {
        this.paintClassPicker();
        this.model.currentClass = this.pickedClass;
        this.repaint();
    }

    repaint(): void {
        this.repaintClassPicker();
        this.repaintHeaders();
        this.repaintCalendar();
        this.repaintDeadlines();
    }

    private repaintHeaders() {
        const today = moment();
        const tomorrow = moment(today).add(1, 'day');
        for (let i = 0; i < 7; ++i) {
            const date = moment(this.model.currentDate).add(i, 'days');
            $('.day-' + i)
                .data('date', date)
                .toggleClass('today', date.isSame(today, 'day'))
                .toggleClass('tomorrow', date.isSame(tomorrow, 'day'))
                .toggleClass('is-holiday', this.model.isHoliday(date))
                .toggleClass('d-none', this.shouldHide(date))
                .find('.date').text(date.format("MMM Do"));
        }
    }

    private paintClassPicker(): void {
        for (let key of this.model.classNames) {
            this.classPicker.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                    .data('class', key)
                    .text(key)
                    .addClass('class-' + key)));
        }
    }

    private repaintClassPicker(): void {
        this.classPicker.find('a').removeClass('active');
        this.classPicker.find('.class-' + this.model.currentClass).addClass('active');
    }

    private repaintDeadlines(): void {
        const el = $('.deadlines .list').html('');
        const deadlines = this.model.recentOrFutureDeadlines();
        for (let i = 0; i < deadlines.length; ++i) {
            el.append($('<dt></dt>').text(deadlines[i].date.format('ddd, Do MMM')));
            el.append($('<dd></dd>').html(deadlines[i].title).toggleClass('expired', deadlines[i].expired));
        }
    }

    private repaintCalendar(): void {
        $('.day .info').html('');

        const weekRota = this.model.currentRota();
        console.log(weekRota);
        if (weekRota !== undefined) {
            for (const key of Calendar.weekdays()) {
                const dayInfo = weekRota[key];
                console.log(key);
                if (dayInfo === undefined) {
                    continue;
                }
                this.repaintCalendarDay(key, dayInfo);
            }
        }
    }

    private repaintCalendarDay(day: string, info: DayData): void {
        const date = $('.day.' + day).data('date');
        const dl = $('<dl></dl>');

        Calendar.createSectionList('Deadlines', this.model.deadlines(date), dl);
        Calendar.createSectionText('Uniform', this.model.uniform(date).reverse(), dl);
        Calendar.createSectionText('Activities', this.model.games(date), dl);
        Calendar.createSectionList('Kit', this.model.kit(date), dl);

        const timings = this.model.timings(date);
        if (timings && timings.length) {
            const dd = Calendar.createSection('Timings', dl);
            for (let i = 0; i < timings.length; ++i) {
                dd.append($('<div></div>')
                    .html(Calendar.markup(timings[i].title))
                    .append($('<span class="float-right"></span>').html(timings[i].time)));
            }
        }

        if (info['menu'] !== undefined && info['menu'].length > 0) {
            const menu = info.menu[0];
            const dd = Calendar.createSection('Menu', dl);
            const ul = dd;
            if (menu['mains']) {
                ul.append($('<div></div>').html('<b>Mains: </b>' + menu.mains.join(", ")));
            }
            if (menu['sides']) {
                ul.append($('<div></div>').html('<b>Sides: </b>' + menu.sides.join(", ")));
            }
            if (menu['desserts']) {
                ul.append($('<div></div>').html('<b>Desserts: </b>' + menu.desserts.join(", ")));
            }
        }

        $('.day.' + day + ' .info').append(dl);
    }

    private static createSection(title: string, dl: JQuery<HTMLElement>): JQuery<HTMLElement> {
        const dd = $('<dd></dd>');
        dl.append($('<dt></dt>').html(title))
            .append(dd);
        return dd;
    }

    private static createSectionText(title: string, text: any, dl: JQuery<HTMLElement>): JQuery<HTMLElement> {
        if (!text || text.length === 0 || text === '') {
            return null;
        }

        const markup = CalendarModel.flat([text]).map(o => Calendar.markup(o)).join(', ');
        return Calendar.createSection(title, dl).html(markup);
    }

    private static createSectionList(title: string, list: string[], dl: JQuery<HTMLElement>): JQuery<HTMLElement> {
        if (!list || list.length === 0) {
            return null;
        }

        const ul = $('<ul></ul>');
        for (let i = 0; i < list.length; ++i) {
            ul.append($('<li></li>').html(Calendar.markup(list[i])));
        }
        return Calendar.createSection(title, dl).append(ul);
    }

    private static markup(value: string): string {
        let css = 'normal';
        if (value.startsWith('*')) {
            css = 'highlight';
            value = value.substring(1, value.length);
        } else if (value.startsWith('+')) {
            css = 'special';
            value = value.substring(1, value.length);
        } else if (value.startsWith('!')) {
            css = 'warn';
            value = value.substring(1, value.length);
        }
        return $('<div></div>').append($('<span></span>').addClass(css).html(value)).html();
    }

    private static weekdays() {
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    }

    private scrollWeek(weeks: number): void {
        this.currentDate = moment(this.model.currentDate).add(weeks, 'week');
    }

    private static isMobileView(): boolean {
        return $(window).width() < 768;
    }

    private scrollBest(): void {
        if (!Calendar.isMobileView() || !this.gotoToTodayOrTomorrow()) {
            Calendar.gotoTop();
        }
    }

    private static gotoTop(): void {
        Calendar.scrollTo('#calendar-container');
    }

    private gotoToday(): void {
        if ($('.day.today').length === 0) {
            this.currentDate = moment();
            this.repaint();
        }
        Calendar.scrollTo('.day.today');
    }

    private gotoTomorrow(): void {
        if ($('.day.tomorrow').length === 0) {
            this.currentDate = moment().add(1, 'day');
            this.repaint();
        }
        Calendar.scrollTo('.day.tomorrow');
    }

    private gotoToTodayOrTomorrow(): boolean {
        if ($('.day.today').length) {
            this.gotoToday();
            return true;
        } else if ($('.day.tomorrow').length) {
            this.gotoTomorrow();
            return true;
        }
        return false;
    }

    private static scrollTo(selector: string): void {
        const tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({scrollTop: tag.offset().top - $('.sticky-top').height()}, 'slow');
        }
    }

    private static listener(fn: (e: Event) => void) {
        return function (e: Event) {
            e.preventDefault();
            fn(e);
        }.bind(this);
    }

    private listeners(): void {
        $('.class-pick a').click(Calendar.listener((e) => this.pickedClass = ($(e.target).data('class'))));
        $('.prev-week').click(() => this.scrollWeek(-1));
        $('.this-week').click(() => this.currentDate = moment());
        $('.next-week').click(() => this.scrollWeek(1));
        $('.key .today').click(() => this.gotoToday());
        $('.key .tomorrow').click(() => this.gotoTomorrow());
        $('.key .deadlines').click(() => Calendar.scrollTo('.col-12.deadlines'));
    }

    init(): void {
        this.paint();
        this.listeners();
        if (Calendar.isMobileView()) {
            this.gotoToTodayOrTomorrow();
        }
    }

    private shouldHide(date: moment.Moment) {
        return date.isoWeekday() > 5 && !this.model.hasData(date);
    }
}
