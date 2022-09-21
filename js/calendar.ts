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
    title?: string;
    matcher?: Function;
    monday?: DayData[];
    tuesday?: DayData[];
    wednesday?: DayData[];
    thursday?: DayData[];
    friday?: DayData[];
    saturday?: DayData[];
    sunday?: DayData[];
}

interface WeekSchedule {
    title?: string;
    matcher?: Function;
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

interface KeyValue {
    key: string;
    value: string;
}

interface AdditionalMeta {
    title: string;
    multiselect: boolean;
    values: KeyValue[]
}

interface DataAdditional {
    meta: AdditionalMeta[];
    data: DataGroupMap;
}

interface Data {
    weekLabel?: Function;
    yeargroup: DataGroup;
    classes: DataGroupMap;
    additional?: DataAdditional;
    termTimes: DateRange[];
}


class CalendarModel {
    private _currentDate: moment.Moment;
    private _data: Data;
    private readonly _context: string;
    public currentClass: string;
    public currentOptions: string[];

    constructor(data: Data, context: string) {
        this.currentDate = moment();
        this._data = data;
        this._context = context;
    }

    get classNames(): Array<string> {
        return Object.keys(this._data.classes);
    }

    get hasOptionGroups(): boolean {
        return this._data.additional && this._data.additional.meta && this._data.additional.meta.length > 0;
    }

    get optionGroups(): Array<AdditionalMeta> {
        return this.hasOptionGroups
            ? this._data.additional.meta
            : [];
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

    get optionPickKey(): string {
        return this._context ? 'pick-option-' + this._context : 'pick-option'
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

    currentRota(): WeekSchedule {
        const stack = [
            this.getRotaForWeek(this.optional(['yeargroup', 'rota'], {})) || {},
            this.getRotaForWeek(this.optional(['classes', this.currentClass, 'rota'], {})) || {}
        ]

        if (this.currentOptions) {
            for (const currentOption of this.currentOptions) {
                const optionRota = this.getRotaForWeek(this.optional(['additional', 'data', currentOption, 'rota'], null));
                if (optionRota) {
                    stack.push(optionRota);
                }
            }
        }

        let result = stack[0];
        for (let i = 1; i < stack.length; ++i) {
            result = {
                monday: CalendarModel.merge(stack[i]['monday'], result['monday']),
                tuesday: CalendarModel.merge(stack[i]['tuesday'], result['tuesday']),
                wednesday: CalendarModel.merge(stack[i]['wednesday'], result['wednesday']),
                thursday: CalendarModel.merge(stack[i]['thursday'], result['thursday']),
                friday: CalendarModel.merge(stack[i]['friday'], result['friday']),
                saturday: {},
                sunday: {},
                title: CalendarModel.firstNonEmpty(stack[i], result, 'title').toString(),
            }
        }
        return result;
    }

    private getRotaForWeek(rotas: WeekRotaMap): WeekSchedule {
        if (!rotas) {
            return undefined;
        }
        for (let key of Object.keys(rotas)) {
            const rota = rotas[key];
            if (this.isRotaForWeek(rota)) {
                const ws = CalendarModel.toWeekSchedule(rota);
                if(!ws.title && typeof(this._data.weekLabel) !== 'undefined') {
                    ws.title = this._data.weekLabel(this.currentDate);
                }
                return ws;
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

    kit(date: moment.Moment, week: WeekSchedule): string[] {
        return this.arrayJoin(date, 'kit', week);
    }

    uniform(date: moment.Moment, week: WeekSchedule): string[] {
        return this.arrayJoin(date, 'uniform', week);
    }

    games(date: moment.Moment, week: WeekSchedule): string[] {
        return this.arrayJoin(date, 'games', week);
    }

    timings(date: moment.Moment, week: WeekSchedule): Timing[] {
        const overrides: Timing[] = CalendarModel.value(this.overrides(date), 'timings', [])
            .map(o => { return  { title: CalendarModel.markup(o.title, '*'), time: o.time} });
        const extra: Timing[] = CalendarModel.value(this.extras(date), 'timings', [])
            .map(o => { return  { title: CalendarModel.markup(o.title, '+'), time: o.time} });
        const rota: Timing[] = CalendarModel.dayValue(week, date, 'timings', []);

        const allTimings = overrides.length ? overrides : extra.concat(rota);
        const removeList = allTimings.filter((o) => o.title.startsWith('-')).map((o) => o.title);
        const timings = allTimings.filter((o) => !o.title.startsWith('-') && !removeList.includes('-' + o.title));
        return (timings)
            .sort(CalendarModel.sortTime);
    }

    private static markup(value: string, symbol: string) {
        if (value !== undefined && (value.startsWith("*") || value.startsWith("+"))) {
            value = value.substring(1, value.length);
        }

        if (value !== undefined && (value.startsWith("-"))) {
            return value;
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

    private arrayJoin(date: moment.Moment, key: string, week: WeekSchedule) {
        const overrides: string[] = CalendarModel.value(this.overrides(date), key, [])
            .map(o => CalendarModel.markup(o, '*'));
        const extra: string[] = CalendarModel.value(this.extras(date), key, [])
            .map(o => CalendarModel.markup(o, '+'));
        const rota: string[] = CalendarModel.dayValue(week, date, key, []);

        return this.dedup(overrides.length ? overrides : extra.concat(rota));
    }

    private dedup(arr: string[]) {
        return arr.filter(function (value, index, array) {
            return array.indexOf(value) === index;
        });
    }

    // private stringJoin(date: moment.Moment, key: string) {
    //     const overrides: string = CalendarModel.value(this.overrides(date), key, '');
    //     const extra: string = CalendarModel.value(this.extras(date), key, null);
    //     const rota: string = CalendarModel.dayValue(this.currentRota(), date, key, null);
    //     return overrides && overrides.length
    //         ? '*' + CalendarModel.flat([overrides]).join(", ")
    //         : CalendarModel.flat([extra, rota].filter(o => o && o.length)).join(", ");
    // }

    static dayValue(info: WeekSchedule, date: moment.Moment, key: string, def: any): any {
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

    private static merge(primary: DayData, secondary: DayData) : DayData {
        return {
            uniform: CalendarModel.firstNonEmpty(primary, secondary, 'uniform'),
            games: CalendarModel.concatKey(primary, secondary, 'games'),
            kit: CalendarModel.concatKey(primary, secondary, 'kit'),
            timings: CalendarModel.concatKey(primary, secondary, 'timings'),
            menu: CalendarModel.concatKey(primary, secondary, 'menu')
        }
    }

    private static normalise(data: DayData[]) : DayData {
        const a = data ? CalendarModel.flat([data]) : [];
        let result = {
            uniform: [],
            games: [],
            kit: [],
            timings: [],
            menu: []
        }
        for (let i = 0; i < a.length; ++i) {
            result = {
                uniform: CalendarModel.concatKey(result, a[i], 'uniform'),
                games: CalendarModel.concatKey(result, a[i], 'games'),
                kit: CalendarModel.concatKey(result, a[i], 'kit'),
                timings: CalendarModel.concatKey(result, a[i], 'timings'),
                menu: CalendarModel.concatKey(result, a[i], 'menu')
            }
        }
        return result;
    }

    private static concatKey(first: any, second: any, key: string) {
        const a = first && first[key] ? CalendarModel.flat([first[key]]) : [];
        const b = second && second[key] ? CalendarModel.flat([second[key]]) : [];
        return a.concat(b);
    }

    private static firstNonEmpty(first: any, second: any, key: string) {
        const a = first && first[key] ? CalendarModel.flat([first[key]]) : [];
        const b = second && second[key] ? CalendarModel.flat([second[key]]) : [];
        return a.length > 0 ? a : b;
    }

    private static lastNonEmpty(first: any, second: any, key: string) {
        return CalendarModel.firstNonEmpty(second, first, key);
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

    hasData(date: moment.Moment, week: WeekSchedule) {
        return this.uniform(date, week).length > 0
            || this.games(date, week).length > 0
            || this.kit(date, week).length > 0
            || this.timings(date, week).length > 0;
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
        if(!rota.matcher) {
            return true;
        }
        return rota.matcher(this.currentDate);
    }

    private static toWeekSchedule(rota: WeekRota) : WeekSchedule {
        return {
            title: rota.title,
            matcher: rota.matcher,
            monday: this.normalise(rota.monday),
            tuesday: this.normalise(rota.tuesday),
            wednesday: this.normalise(rota.wednesday),
            thursday: this.normalise(rota.thursday),
            friday: this.normalise(rota.friday),
            saturday: this.normalise(rota.saturday),
            sunday: this.normalise(rota.sunday),
        }
    }
}

class Calendar {
    model: CalendarModel;
    classPicker: JQuery<HTMLElement>;
    optionPicker: JQuery<HTMLElement>;

    constructor(data: Data, context: string) {
        this.model = new CalendarModel(data, context);
        this.classPicker = $('.class-pick');
        this.optionPicker = $('#options');
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

    get pickedOptions(): string[] {
        try {
            const optionsCsv = localStorage.getItem(this.model.optionPickKey);
            return !optionsCsv ? [] : optionsCsv.split(',');
        } catch (e) {
            return $($('.class-pick a')[0]).data('class');
        }
    }

    set pickedOptions(options: string[]) {
        this.model.currentOptions = options;
        try {
            localStorage.setItem(this.model.optionPickKey, options.join(','));
        } catch (err) {
        }
        this.repaint();
    }

    set currentDate(date: moment.Moment) {
        this.model.currentDate = date;
        window.location.hash = this.model.currentDate.format('YYYY-WW') == moment().format('YYYY-WW')
            ? ''
            : this.model.currentDate.format('YYYY-WW');

        this.repaint();
        this.scrollBest();
    }

    paint(): void {
        this.paintClassPicker();
        this.paintOptions();
        this.model.currentClass = this.pickedClass;
        this.model.currentOptions = this.pickedOptions;
        this.repaint();
    }

    repaint(): void {
        const weekRota = this.model.currentRota();
        this.repaintClassPicker();
        this.repaintHeaders(weekRota);
        this.repaintCalendar(weekRota);
        this.repaintDeadlines();
    }

    private repaintHeaders(weekRota: WeekSchedule) {
        const today = moment();
        const tomorrow = moment(today).add(1, 'day');
        for (let i = 0; i < 7; ++i) {
            const date = moment(this.model.currentDate).add(i, 'days');
            $('.day-' + i)
                .data('date', date)
                .toggleClass('today', date.isSame(today, 'day'))
                .toggleClass('tomorrow', date.isSame(tomorrow, 'day'))
                .toggleClass('is-holiday', this.model.isHoliday(date))
                .toggleClass('d-none', this.shouldHide(date, weekRota))
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

    private paintOptions(): void {
        const options = this.pickedOptions;
        for (let group of this.model.optionGroups) {
            const optionGroup = $('<div class="option-group my-2"></div>')
                    .append($('<div class="option-group-title"></div>').text(group.title));

            for (let option of group.values) {
                const input = $('<input type="radio" class="custom-control-input option-input">')
                    .attr('id', 'option-' + option.key)
                    .attr('name', group.title)
                    .attr('type', group.multiselect ? 'checkbox' : 'radio')
                    .data('key', option.key)

                if (options.includes(option.key)) {
                    (input[0] as HTMLInputElement).checked = true;
                }

                const label = $('<label class="custom-control-label"></label>')
                    .text(option.value)
                    .attr('for', 'option-' + option.key)
                optionGroup.append($('<div class="custom-control custom-control-inline"></div>')
                    .addClass(group.multiselect ? 'custom-checkbox' : 'custom-radio')
                    .append(input)
                    .append(label));
            }

            this.optionPicker.append(optionGroup);
        }

        if (this.model.hasOptionGroups) {
            $('body').addClass('has-options');
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

    private repaintCalendar(weekRota: WeekSchedule): void {
        $('.day .info').html('');

        const title = $('#title').html(weekRota.title).toggle(weekRota.title != undefined && weekRota.title.trim().length > 0);
        if (weekRota !== undefined) {
            for (const key of Calendar.weekdays()) {
                const dayInfo = weekRota[key];
                if (dayInfo === undefined) {
                    continue;
                }
                this.repaintCalendarDay(key, dayInfo, weekRota);
            }
        }
    }

    private repaintCalendarDay(day: string, info: DayData, week: WeekSchedule): void {
        const date = $('.day.' + day).data('date');
        const dl = $('<dl></dl>');

        Calendar.createSectionList('Deadlines', this.model.deadlines(date), dl);
        Calendar.createSectionText('Uniform', this.model.uniform(date, week).reverse(), dl);
        Calendar.createSectionText('Activities', this.model.games(date, week), dl);
        Calendar.createSectionList('Kit', this.model.kit(date, week), dl);

        const timings = this.model.timings(date, week);
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
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    }

    private scrollWeek(weeks: number): void {
        this.currentDate = moment(this.model.currentDate).add(weeks, 'week');
    }

    private static isMobileView(): boolean {
        return $(window).width() < 768;
    }

    private scrollBest(): void {
        if (!Calendar.isMobileView()) {
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
            if (moment('19', "hh").isBefore(moment())) {
                this.gotoTomorrow();
                return true;
            }
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

    private static collectOptionKeys() : string[] {
        return $('.option-input:checked').toArray().map((x) => $(x).data('key'));
    }

    private listeners(): void {
        $('.class-pick a').click(Calendar.listener((e) => this.pickedClass = ($(e.target).data('class'))));
        $('.option-input').click(() => this.pickedOptions = Calendar.collectOptionKeys());
        $('.prev-week').click(() => this.scrollWeek(-1));
        $('.this-week').click(() => this.currentDate = moment());
        $('.next-week').click(() => this.scrollWeek(1));
        $('.key .today').click(() => this.gotoToday());
        $('.key .tomorrow').click(() => this.gotoTomorrow());
        $('.key .deadlines').click(() => Calendar.scrollTo('.col-12.deadlines'));
    }

    init(): void {
        const date = window.location.hash;
        if (date && date.match(/\d{4}-\d{1,2}/)) {
            this.currentDate = moment(date.substring(1), 'YYYY-WW');
            this.model.currentDate = moment(date.substring(1), 'YYYY-WW');
        }
        this.paint();
        this.listeners();
        if (Calendar.isMobileView()) {
            this.gotoToTodayOrTomorrow();
        }
    }

    private shouldHide(date: moment.Moment, week: WeekSchedule) {
        return date.isoWeekday() > 5 && !this.model.hasData(date, week);
    }
}
