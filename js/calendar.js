var CalendarModel = /** @class */ (function () {
    function CalendarModel(data, context) {
        this.currentDate = moment();
        this._data = data;
        this._context = context;
    }
    Object.defineProperty(CalendarModel.prototype, "classNames", {
        get: function () {
            return Object.keys(this._data.classes);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "hasOptionGroups", {
        get: function () {
            return this._data.additional && this._data.additional.meta && this._data.additional.meta.length > 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "optionGroups", {
        get: function () {
            return this.hasOptionGroups
                ? this._data.additional.meta
                : [];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "currentDate", {
        get: function () {
            return this._currentDate;
        },
        set: function (date) {
            this._currentDate = date.startOf('isoWeek');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "classPickKey", {
        get: function () {
            return this._context ? 'pick-class-' + this._context : 'pick-class';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CalendarModel.prototype, "optionPickKey", {
        get: function () {
            return this._context ? 'pick-option-' + this._context : 'pick-option';
        },
        enumerable: false,
        configurable: true
    });
    CalendarModel.prototype.optional = function (stack, def) {
        var cursor = this._data;
        for (var i = 0; i < stack.length; ++i) {
            cursor = cursor[stack[i]];
            if (cursor === undefined) {
                return def;
            }
        }
        return cursor;
    };
    CalendarModel.prototype.currentRota = function () {
        var stack = [
            this.getRotaForWeek(this.optional(['yeargroup', 'rota'], {})) || {},
            this.getRotaForWeek(this.optional(['classes', this.currentClass, 'rota'], {})) || {}
        ];
        if (this.currentOptions) {
            for (var _i = 0, _a = this.currentOptions; _i < _a.length; _i++) {
                var currentOption = _a[_i];
                var optionRota = this.getRotaForWeek(this.optional(['additional', 'data', currentOption, 'rota'], null));
                if (optionRota) {
                    stack.push(optionRota);
                }
            }
        }
        var result = stack[0];
        for (var i = 1; i < stack.length; ++i) {
            result = {
                monday: CalendarModel.merge(stack[i]['monday'], result['monday']),
                tuesday: CalendarModel.merge(stack[i]['tuesday'], result['tuesday']),
                wednesday: CalendarModel.merge(stack[i]['wednesday'], result['wednesday']),
                thursday: CalendarModel.merge(stack[i]['thursday'], result['thursday']),
                friday: CalendarModel.merge(stack[i]['friday'], result['friday']),
                saturday: {},
                sunday: {},
                title: CalendarModel.firstNonEmpty(stack[i], result, 'title').toString(),
            };
        }
        return result;
    };
    CalendarModel.prototype.getRotaForWeek = function (rotas) {
        for (var _i = 0, _a = Object.keys(rotas); _i < _a.length; _i++) {
            var key = _a[_i];
            var rota = rotas[key];
            if (this.isRotaForWeek(rota)) {
                return CalendarModel.toWeekSchedule(rota);
            }
        }
        return undefined;
    };
    CalendarModel.prototype.extras = function (date) {
        return this.mergeForKey(date, 'extras');
    };
    CalendarModel.prototype.overrides = function (date) {
        return this.mergeForKey(date, 'overrides');
    };
    CalendarModel.prototype.mergeForKey = function (date, key) {
        var dkey = date.format('YYYY-MM-DD');
        var year = this.optional(['yeargroup', key, dkey], {});
        var clas = this.optional(['classes', this.currentClass, key, dkey], {});
        return CalendarModel.merge(clas, year);
    };
    CalendarModel.prototype.isTermTime = function (date) {
        return this._data.termTimes.find(function (o) { return CalendarModel.containsDate(o, date); }) !== undefined;
    };
    CalendarModel.prototype.isHoliday = function (date) {
        return !this.isTermTime(date);
    };
    CalendarModel.prototype.kit = function (date, week) {
        return this.arrayJoin(date, 'kit', week);
    };
    CalendarModel.prototype.uniform = function (date, week) {
        return this.arrayJoin(date, 'uniform', week);
    };
    CalendarModel.prototype.games = function (date, week) {
        return this.arrayJoin(date, 'games', week);
    };
    CalendarModel.prototype.timings = function (date, week) {
        var overrides = CalendarModel.value(this.overrides(date), 'timings', [])
            .map(function (o) { return { title: CalendarModel.markup(o.title, '*'), time: o.time }; });
        var extra = CalendarModel.value(this.extras(date), 'timings', [])
            .map(function (o) { return { title: CalendarModel.markup(o.title, '+'), time: o.time }; });
        var rota = CalendarModel.dayValue(week, date, 'timings', []);
        return (overrides.length ? overrides : extra.concat(rota))
            .sort(CalendarModel.sortTime);
    };
    CalendarModel.markup = function (value, symbol) {
        if (value !== undefined && (value.startsWith("*") || value.startsWith("+"))) {
            value = value.substring(1, value.length);
        }
        return symbol + value;
    };
    CalendarModel.sortTime = function (l, r) {
        if (l.time.endsWith('am') && r.time.endsWith('pm')) {
            return -1;
        }
        if (l.time.endsWith('pm') && r.time.endsWith('am')) {
            return 1;
        }
        var lt = l.time.split(':');
        var rt = r.time.split(':');
        var hour = (parseInt(lt[0]) || 0) - (parseInt(rt[0]) || 0);
        if (hour != 0) {
            return hour;
        }
        var min = (lt.length > 1 ? parseInt(lt[1]) : 0) - (rt.length > 0 ? parseInt(rt[1]) : 0);
        if (min != 0) {
            return min;
        }
        return l.title.localeCompare(r.title);
    };
    CalendarModel.prototype.arrayJoin = function (date, key, week) {
        var overrides = CalendarModel.value(this.overrides(date), key, [])
            .map(function (o) { return CalendarModel.markup(o, '*'); });
        var extra = CalendarModel.value(this.extras(date), key, [])
            .map(function (o) { return CalendarModel.markup(o, '+'); });
        var rota = CalendarModel.dayValue(week, date, key, []);
        return this.dedup(overrides.length ? overrides : extra.concat(rota));
    };
    CalendarModel.prototype.dedup = function (arr) {
        return arr.filter(function (value, index, array) {
            return array.indexOf(value) === index;
        });
    };
    // private stringJoin(date: moment.Moment, key: string) {
    //     const overrides: string = CalendarModel.value(this.overrides(date), key, '');
    //     const extra: string = CalendarModel.value(this.extras(date), key, null);
    //     const rota: string = CalendarModel.dayValue(this.currentRota(), date, key, null);
    //     return overrides && overrides.length
    //         ? '*' + CalendarModel.flat([overrides]).join(", ")
    //         : CalendarModel.flat([extra, rota].filter(o => o && o.length)).join(", ");
    // }
    CalendarModel.dayValue = function (info, date, key, def) {
        return info
            ? CalendarModel.value(info[date.format('dddd').toLowerCase()], key, [])
            : def;
    };
    CalendarModel.value = function (info, key, def) {
        return info && info[key] ? info[key] : def;
    };
    CalendarModel.flat = function (arr) {
        return arr.reduce(function (acc, val) { return acc.concat(val); }, []);
    };
    CalendarModel.merge = function (primary, secondary) {
        return {
            uniform: CalendarModel.firstNonEmpty(primary, secondary, 'uniform'),
            games: CalendarModel.concatKey(primary, secondary, 'games'),
            kit: CalendarModel.concatKey(primary, secondary, 'kit'),
            timings: CalendarModel.concatKey(primary, secondary, 'timings'),
            menu: CalendarModel.concatKey(primary, secondary, 'menu')
        };
    };
    CalendarModel.normalise = function (data) {
        var a = data ? CalendarModel.flat([data]) : [];
        var result = {
            uniform: [],
            games: [],
            kit: [],
            timings: [],
            menu: []
        };
        for (var i = 0; i < a.length; ++i) {
            result = {
                uniform: CalendarModel.concatKey(result, a[i], 'uniform'),
                games: CalendarModel.concatKey(result, a[i], 'games'),
                kit: CalendarModel.concatKey(result, a[i], 'kit'),
                timings: CalendarModel.concatKey(result, a[i], 'timings'),
                menu: CalendarModel.concatKey(result, a[i], 'menu')
            };
        }
        return result;
    };
    CalendarModel.concatKey = function (first, second, key) {
        var a = first && first[key] ? CalendarModel.flat([first[key]]) : [];
        var b = second && second[key] ? CalendarModel.flat([second[key]]) : [];
        return a.concat(b);
    };
    CalendarModel.firstNonEmpty = function (first, second, key) {
        var a = first && first[key] ? CalendarModel.flat([first[key]]) : [];
        var b = second && second[key] ? CalendarModel.flat([second[key]]) : [];
        return a.length > 0 ? a : b;
    };
    CalendarModel.lastNonEmpty = function (first, second, key) {
        return CalendarModel.firstNonEmpty(second, first, key);
    };
    CalendarModel.prototype.recentOrFutureDeadlines = function () {
        var recent = this.deadlineForList(this.optional(['yeargroup', 'deadlines'], undefined))
            .concat(this.deadlineForList(this.optional(['classes', this.currentClass, 'deadlines'], undefined)));
        return recent.sort(function (l, r) {
            return l.date.diff(r.date, 'day');
        });
    };
    CalendarModel.prototype.deadlines = function (date) {
        var dkey = date.format('YYYY-MM-DD');
        return this.optional(['yeargroup', 'deadlines', dkey], [])
            .concat(this.optional(['classes', this.currentClass, 'deadlines', dkey], []))
            .map(function (o) { return '!' + o; });
    };
    CalendarModel.prototype.hasData = function (date, week) {
        return this.uniform(date, week).length > 0
            || this.games(date, week).length > 0
            || this.kit(date, week).length > 0
            || this.timings(date, week).length > 0;
    };
    CalendarModel.prototype.deadlineForList = function (deadlines) {
        if (deadlines === undefined) {
            return [];
        }
        var list = [];
        var today = moment().startOf('day');
        var after = moment(today).subtract(1, 'week');
        var _loop_1 = function (key) {
            var date = moment(key);
            if (date.isBefore(after)) {
                return "continue";
            }
            var values = deadlines[key];
            list = list.concat(values.map(function (t) {
                return {
                    date: date,
                    title: t,
                    expired: date.isBefore(today)
                };
            }));
        };
        for (var _i = 0, _a = Object.keys(deadlines); _i < _a.length; _i++) {
            var key = _a[_i];
            _loop_1(key);
        }
        return list;
    };
    CalendarModel.containsDate = function (range, date) {
        return date.isBetween(range.start, range.end, 'day', '[]');
    };
    CalendarModel.prototype.isRotaForWeek = function (rota) {
        if (!rota.start) {
            return true;
        }
        var weeks = this.currentDate.diff(rota.start, "week");
        return weeks >= 0 && weeks % rota.frequency === 0;
    };
    CalendarModel.toWeekSchedule = function (rota) {
        return {
            title: rota.title,
            start: rota.start,
            frequency: rota.frequency,
            monday: this.normalise(rota.monday),
            tuesday: this.normalise(rota.tuesday),
            wednesday: this.normalise(rota.wednesday),
            thursday: this.normalise(rota.thursday),
            friday: this.normalise(rota.friday),
            saturday: this.normalise(rota.saturday),
            sunday: this.normalise(rota.sunday),
        };
    };
    return CalendarModel;
}());
var Calendar = /** @class */ (function () {
    function Calendar(data, context) {
        this.model = new CalendarModel(data, context);
        this.classPicker = $('.class-pick');
        this.optionPicker = $('#options');
        this.init();
    }
    Object.defineProperty(Calendar.prototype, "pickedClass", {
        get: function () {
            try {
                var cls = localStorage.getItem(this.model.classPickKey);
                return !cls ? $($('.class-pick a')[0]).data('class') : cls;
            }
            catch (e) {
                return $($('.class-pick a')[0]).data('class');
            }
        },
        set: function (cls) {
            this.model.currentClass = cls;
            try {
                localStorage.setItem(this.model.classPickKey, cls);
            }
            catch (err) {
            }
            this.repaint();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Calendar.prototype, "pickedOptions", {
        get: function () {
            try {
                var optionsCsv = localStorage.getItem(this.model.optionPickKey);
                return !optionsCsv ? [] : optionsCsv.split(',');
            }
            catch (e) {
                return $($('.class-pick a')[0]).data('class');
            }
        },
        set: function (options) {
            this.model.currentOptions = options;
            try {
                localStorage.setItem(this.model.optionPickKey, options.join(','));
            }
            catch (err) {
            }
            this.repaint();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Calendar.prototype, "currentDate", {
        set: function (date) {
            this.model.currentDate = date;
            window.location.hash = this.model.currentDate.format('YYYY-WW') == moment().format('YYYY-WW')
                ? ''
                : this.model.currentDate.format('YYYY-WW');
            this.repaint();
            this.scrollBest();
        },
        enumerable: false,
        configurable: true
    });
    Calendar.prototype.paint = function () {
        this.paintClassPicker();
        this.paintOptions();
        this.model.currentClass = this.pickedClass;
        this.model.currentOptions = this.pickedOptions;
        this.repaint();
    };
    Calendar.prototype.repaint = function () {
        var weekRota = this.model.currentRota();
        this.repaintClassPicker();
        this.repaintHeaders(weekRota);
        this.repaintCalendar(weekRota);
        this.repaintDeadlines();
    };
    Calendar.prototype.repaintHeaders = function (weekRota) {
        var today = moment();
        var tomorrow = moment(today).add(1, 'day');
        for (var i = 0; i < 7; ++i) {
            var date = moment(this.model.currentDate).add(i, 'days');
            $('.day-' + i)
                .data('date', date)
                .toggleClass('today', date.isSame(today, 'day'))
                .toggleClass('tomorrow', date.isSame(tomorrow, 'day'))
                .toggleClass('is-holiday', this.model.isHoliday(date))
                .toggleClass('d-none', this.shouldHide(date, weekRota))
                .find('.date').text(date.format("MMM Do"));
        }
    };
    Calendar.prototype.paintClassPicker = function () {
        for (var _i = 0, _a = this.model.classNames; _i < _a.length; _i++) {
            var key = _a[_i];
            this.classPicker.append($('<li class="nav-item"></li>')
                .append($('<a class="nav-link" href="#"></a>')
                .data('class', key)
                .text(key)
                .addClass('class-' + key)));
        }
    };
    Calendar.prototype.paintOptions = function () {
        var options = this.pickedOptions;
        for (var _i = 0, _a = this.model.optionGroups; _i < _a.length; _i++) {
            var group = _a[_i];
            var optionGroup = $('<div class="option-group my-2"></div>')
                .append($('<div class="option-group-title"></div>').text(group.title));
            for (var _b = 0, _c = group.values; _b < _c.length; _b++) {
                var option = _c[_b];
                var input = $('<input type="radio" class="custom-control-input option-input">')
                    .attr('id', 'option-' + option.key)
                    .attr('name', group.title)
                    .attr('type', group.multiselect ? 'checkbox' : 'radio')
                    .data('key', option.key);
                if (options.includes(option.key)) {
                    input[0].checked = true;
                }
                var label = $('<label class="custom-control-label"></label>')
                    .text(option.value)
                    .attr('for', 'option-' + option.key);
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
    };
    Calendar.prototype.repaintClassPicker = function () {
        this.classPicker.find('a').removeClass('active');
        this.classPicker.find('.class-' + this.model.currentClass).addClass('active');
    };
    Calendar.prototype.repaintDeadlines = function () {
        var el = $('.deadlines .list').html('');
        var deadlines = this.model.recentOrFutureDeadlines();
        for (var i = 0; i < deadlines.length; ++i) {
            el.append($('<dt></dt>').text(deadlines[i].date.format('ddd, Do MMM')));
            el.append($('<dd></dd>').html(deadlines[i].title).toggleClass('expired', deadlines[i].expired));
        }
    };
    Calendar.prototype.repaintCalendar = function (weekRota) {
        $('.day .info').html('');
        var title = $('#title').html(weekRota.title).toggle(weekRota.title != undefined && weekRota.title.length > 0);
        if (weekRota !== undefined) {
            for (var _i = 0, _a = Calendar.weekdays(); _i < _a.length; _i++) {
                var key = _a[_i];
                var dayInfo = weekRota[key];
                if (dayInfo === undefined) {
                    continue;
                }
                this.repaintCalendarDay(key, dayInfo, weekRota);
            }
        }
    };
    Calendar.prototype.repaintCalendarDay = function (day, info, week) {
        var date = $('.day.' + day).data('date');
        var dl = $('<dl></dl>');
        Calendar.createSectionList('Deadlines', this.model.deadlines(date), dl);
        Calendar.createSectionText('Uniform', this.model.uniform(date, week).reverse(), dl);
        Calendar.createSectionText('Activities', this.model.games(date, week), dl);
        Calendar.createSectionList('Kit', this.model.kit(date, week), dl);
        var timings = this.model.timings(date, week);
        if (timings && timings.length) {
            var dd = Calendar.createSection('Timings', dl);
            for (var i = 0; i < timings.length; ++i) {
                dd.append($('<div></div>')
                    .html(Calendar.markup(timings[i].title))
                    .append($('<span class="float-right"></span>').html(timings[i].time)));
            }
        }
        if (info['menu'] !== undefined && info['menu'].length > 0) {
            var menu = info.menu[0];
            var dd = Calendar.createSection('Menu', dl);
            var ul = dd;
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
    };
    Calendar.createSection = function (title, dl) {
        var dd = $('<dd></dd>');
        dl.append($('<dt></dt>').html(title))
            .append(dd);
        return dd;
    };
    Calendar.createSectionText = function (title, text, dl) {
        if (!text || text.length === 0 || text === '') {
            return null;
        }
        var markup = CalendarModel.flat([text]).map(function (o) { return Calendar.markup(o); }).join(', ');
        return Calendar.createSection(title, dl).html(markup);
    };
    Calendar.createSectionList = function (title, list, dl) {
        if (!list || list.length === 0) {
            return null;
        }
        var ul = $('<ul></ul>');
        for (var i = 0; i < list.length; ++i) {
            ul.append($('<li></li>').html(Calendar.markup(list[i])));
        }
        return Calendar.createSection(title, dl).append(ul);
    };
    Calendar.markup = function (value) {
        var css = 'normal';
        if (value.startsWith('*')) {
            css = 'highlight';
            value = value.substring(1, value.length);
        }
        else if (value.startsWith('+')) {
            css = 'special';
            value = value.substring(1, value.length);
        }
        else if (value.startsWith('!')) {
            css = 'warn';
            value = value.substring(1, value.length);
        }
        return $('<div></div>').append($('<span></span>').addClass(css).html(value)).html();
    };
    Calendar.weekdays = function () {
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    };
    Calendar.prototype.scrollWeek = function (weeks) {
        this.currentDate = moment(this.model.currentDate).add(weeks, 'week');
    };
    Calendar.isMobileView = function () {
        return $(window).width() < 768;
    };
    Calendar.prototype.scrollBest = function () {
        if (!Calendar.isMobileView() || !this.gotoToTodayOrTomorrow()) {
            Calendar.gotoTop();
        }
    };
    Calendar.gotoTop = function () {
        Calendar.scrollTo('#calendar-container');
    };
    Calendar.prototype.gotoToday = function () {
        if ($('.day.today').length === 0) {
            this.currentDate = moment();
            this.repaint();
        }
        Calendar.scrollTo('.day.today');
    };
    Calendar.prototype.gotoTomorrow = function () {
        if ($('.day.tomorrow').length === 0) {
            this.currentDate = moment().add(1, 'day');
            this.repaint();
        }
        Calendar.scrollTo('.day.tomorrow');
    };
    Calendar.prototype.gotoToTodayOrTomorrow = function () {
        if ($('.day.today').length) {
            this.gotoToday();
            return true;
        }
        else if ($('.day.tomorrow').length) {
            this.gotoTomorrow();
            return true;
        }
        return false;
    };
    Calendar.scrollTo = function (selector) {
        var tag = $(selector);
        if (tag.offset() !== undefined) {
            $('html,body').animate({ scrollTop: tag.offset().top - $('.sticky-top').height() }, 'slow');
        }
    };
    Calendar.listener = function (fn) {
        return function (e) {
            e.preventDefault();
            fn(e);
        }.bind(this);
    };
    Calendar.collectOptionKeys = function () {
        return $('.option-input:checked').toArray().map(function (x) { return $(x).data('key'); });
    };
    Calendar.prototype.listeners = function () {
        var _this = this;
        $('.class-pick a').click(Calendar.listener(function (e) { return _this.pickedClass = ($(e.target).data('class')); }));
        $('.option-input').click(function () { return _this.pickedOptions = Calendar.collectOptionKeys(); });
        $('.prev-week').click(function () { return _this.scrollWeek(-1); });
        $('.this-week').click(function () { return _this.currentDate = moment(); });
        $('.next-week').click(function () { return _this.scrollWeek(1); });
        $('.key .today').click(function () { return _this.gotoToday(); });
        $('.key .tomorrow').click(function () { return _this.gotoTomorrow(); });
        $('.key .deadlines').click(function () { return Calendar.scrollTo('.col-12.deadlines'); });
    };
    Calendar.prototype.init = function () {
        var date = window.location.hash;
        if (date && date.match(/\d{4}-\d{1,2}/)) {
            this.currentDate = moment(date.substring(1), 'YYYY-WW');
            this.model.currentDate = moment(date.substring(1), 'YYYY-WW');
        }
        this.paint();
        this.listeners();
        if (Calendar.isMobileView()) {
            this.gotoToTodayOrTomorrow();
        }
    };
    Calendar.prototype.shouldHide = function (date, week) {
        return date.isoWeekday() > 5 && !this.model.hasData(date, week);
    };
    return Calendar;
}());
//# sourceMappingURL=calendar.js.map