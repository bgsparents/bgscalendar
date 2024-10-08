var CwClueDirection;
(function (CwClueDirection) {
    CwClueDirection["across"] = "across";
    CwClueDirection["down"] = "down";
})(CwClueDirection || (CwClueDirection = {}));
class CwCell {
    constructor(cw, x, y) {
        this.cw = cw;
        this.x = x;
        this.y = y;
        this.type = 'block';
        this.id = x + '-' + y;
    }
    isBlock() {
        return this.type == 'block';
    }
    nextX(n) {
        let cx = this.x - 1;
        for (let i = 1; i < this.cw.width; ++i) {
            let x = (cx + this.cw.width + (i * n)) % this.cw.width;
            let cell = this.cw.cell(x + 1, this.y);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    }
    nextY(n) {
        let cy = this.y - 1;
        for (let i = 1; i < this.cw.height; ++i) {
            let y = (cy + this.cw.height + (i * n)) % this.cw.height;
            let cell = this.cw.cell(this.x, y + 1);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    }
    next(n, direction, haltAtClueBoundary) {
        let currentId;
        if (direction === CwClueDirection.across) {
            let cell = this.nextX(n);
            if (cell.across === this.across || cell.x > (this.x * n)) {
                return cell;
            }
            currentId = this.across;
        }
        else {
            let cell = this.nextY(n);
            if (cell.down === this.down || cell.y > (this.y * n)) {
                return cell;
            }
            currentId = this.down;
        }
        if (!haltAtClueBoundary) {
            let next = (currentId - 1 + this.cw.clues.length + n) % this.cw.clues.length;
            return this.cw.clue(next + 1).firstCell;
        }
        return this;
    }
}
function _(json) {
    console.log(json);
}
class CwCrossword {
    constructor(data) {
        let wordXml = data.find("word");
        this.title = $(data.find("metadata")).find("title").text();
        console.log("title=" + this.title);
        this.initClues(data.find("clue"), wordXml);
        this.initGrid(data.find("grid"), wordXml);
    }
    static loadXml(url, callback, error) {
        $.get(url, function (data) {
            callback(new CwCrossword($(data)));
        }).fail(function (jqXHR, textStatus, errorThrown) {
            if (error) {
                error(errorThrown);
            }
            else {
                alert("Failed to load crossword data");
                console.error("Failed to load crossword data - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
            }
        });
    }
    static loadJs(url, callback, error) {
        $.ajax({
            url: url,
            dataType: "jsonp",
        }).fail(function () {
            callback(new CwCrossword($(CrosswordPuzzleData)));
        });
    }
    static loadIndependentXml(code, callback, error) {
        this.loadXml("https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml", callback, error);
    }
    clue(id) {
        if (id > this.clues.length) {
            id = 1;
        }
        else if (id < 1) {
            id = this.clues.length;
        }
        return this.clues[id - 1];
    }
    cell(x, y) {
        return this.grid[x - 1][y - 1];
    }
    cellFromId(cellId) {
        const coord = cellId.split("-").map(n => parseInt(n));
        return this.cell(coord[0], coord[1]);
    }
    initClues(cluesXml, wordXml) {
        this.clues = new Array(wordXml.length);
        cluesXml.each((i, node) => {
            let clueXml = $(node);
            let id = parseInt(clueXml.attr('word'));
            if (clueXml.attr('is-link')) {
            }
            else {
                this.clues[id - 1] = {
                    id: id,
                    number: clueXml.attr('number'),
                    format: clueXml.attr('format'),
                    clue: clueXml.text()
                };
            }
        });
    }
    initGrid(gridXml, wordXml) {
        this.width = parseInt(gridXml.attr('width'));
        this.height = parseInt(gridXml.attr('height'));
        this.grid = new Array(this.width);
        for (let x = 0; x < this.width; ++x) {
            this.grid[x] = new Array(this.height);
            for (let y = 0; y < this.height; ++y) {
                this.grid[x][y] = new CwCell(this, x + 1, y + 1);
            }
        }
        gridXml.find('cell').each((i, node) => {
            let cellXml = $(node);
            let cell = this.cell(parseInt(cellXml.attr('x')), parseInt(cellXml.attr('y')));
            cell.number = cellXml.attr('number');
            cell.solution = cellXml.attr('solution');
        });
        wordXml.each((i, wordNode) => {
            let word = $(wordNode);
            let id = parseInt(word.attr('id'));
            this.wordToGrid(id, word, true);
            word.find('cells').each((i, link) => {
                this.wordToGrid(id, $(link), false);
            });
        });
    }
    wordToGrid(id, word, firstClue) {
        let xl = word.attr('x').split('-').map(n => parseInt(n));
        let yl = word.attr('y').split('-').map(n => parseInt(n));
        let clue = this.clue(id);
        if (firstClue) {
            clue.firstCell = this.cell(xl[0], yl[0]);
        }
        if (xl.length > 1) {
            for (let x = xl[0]; x <= xl[1]; ++x) {
                this.cell(x, yl[0]).across = id;
                this.cell(x, yl[0]).type = 'letter';
            }
        }
        else {
            for (let y = yl[0]; y <= yl[1]; ++y) {
                this.cell(xl[0], y).down = id;
                this.cell(xl[0], y).type = 'letter';
            }
        }
    }
}
class CwBoardCell {
}
class CwBoard {
    constructor(crossword) {
        this.answerListeners = [];
        this.locationListeners = [];
        this.noteListeners = [];
        this.lettersTotal = 0;
        this.lettersFilled = 0;
        this.crossword = crossword;
        this.drawGrid();
        this.hookupKeyboard();
        this.hookupNotes();
        let firstCell = this.crossword.clue(1).firstCell;
        this.focused = {};
        this.focus(firstCell, firstCell.across ? CwClueDirection.across : CwClueDirection.down);
        this.moveFocus(this.crossword.clue(1).firstCell);
    }
    static loadXml(url, callback) {
        CwCrossword.loadXml(url, (cw) => {
            callback(new CwBoard(cw));
        });
    }
    static loadJs(url, callback) {
        CwCrossword.loadJs(url, (cw) => {
            callback(new CwBoard(cw));
        });
    }
    static loadIndependentXml(code, callback) {
        this.loadXml("https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml", callback);
    }
    drawGrid() {
        let that = this;
        this.gridContainer = $('#grid_container').css({
            width: 'calc(2rem * ' + this.crossword.width + ' + ' + (this.crossword.width + 1) + ' * 2px)'
        });
        this.gridTable = $("#grid");
        for (let y = 1; y <= this.crossword.height; ++y) {
            let row = $('<tr>');
            for (let x = 1; x <= this.crossword.width; ++x) {
                let tableCell = $('<td>');
                let cell = this.crossword.cell(x, y);
                if (cell.type === 'block') {
                    tableCell.addClass('block');
                }
                else {
                    this.lettersTotal++;
                    if (cell.number) {
                        tableCell.append($('<span>' + cell.number + '</span>').addClass('number'));
                    }
                    tableCell.append($('<div>').addClass('letter'));
                    if (cell.across) {
                        tableCell.addClass('c' + cell.across);
                    }
                    if (cell.down) {
                        tableCell.addClass('c' + cell.down);
                    }
                    cell.cell = tableCell;
                    tableCell.attr('id', cell.id);
                    tableCell.attr('tabindex', x + y * this.crossword.width);
                    tableCell.data('cell', cell);
                    tableCell.focus((e) => { that.letterFocus(e, cell); });
                    tableCell.click((e) => { that.letterFocus(e, cell); });
                    tableCell.keydown((e) => { that.keyDownListener(e, cell); });
                }
                row.append(tableCell);
            }
            this.gridTable.append(row);
        }
    }
    backspace() {
        this.setFocused('');
        this.moveFocus(this.focused.cell.next(-1, this.focused.direction, true));
    }
    delete() {
        this.setFocused('');
    }
    letter(letter) {
        this.setFocused(letter.toUpperCase());
        let nextCell = this.focused.cell.next(1, this.focused.direction, false);
        this.moveFocus(this.focused.cell.next(1, this.focused.direction, false));
    }
    setLetter(cell, value) {
        let el = $("#" + cell.id + " .letter");
        let currentValue = el.text();
        if (currentValue == value) {
            return;
        }
        el.text(value);
        cell.cell.toggleClass('wrong', value.length > 0 && value != cell.solution);
        this.lettersFilled += value.length - currentValue.length;
        $("#complete_percentage").text(Math.floor(100 * this.lettersFilled / this.lettersTotal));
        this.checkSolutions();
    }
    getLetter(cell) {
        let el = $("#" + cell.id + " .letter");
        return el.text();
    }
    checkSolutions() {
        const el = $("#complete");
        if (this.lettersFilled == this.lettersTotal) {
            let hasMistake = false;
            for (let x = 1; x <= this.crossword.width; ++x) {
                for (let y = 1; y <= this.crossword.height; ++y) {
                    const cell = this.crossword.cell(x, y);
                    if (!cell.isBlock() && this.getLetter(cell) != cell.solution) {
                        hasMistake = true;
                    }
                }
            }
            el.addClass(hasMistake ? 'wrong' : 'right');
        }
        else {
            el.removeClass("wrong right");
        }
    }
    setFocused(value) {
        this.setLetter(this.focused.cell, value);
        this.fireAnswerListeners(this.focused.cell, value);
    }
    fireAnswerListeners(cell, answer) {
        this.answerListeners.forEach(l => { l(cell, answer); });
    }
    fireLocationListeners(cell) {
        this.locationListeners.forEach(l => { l(cell); });
    }
    keyDownListener(e, cell) {
        if (e.which === 37) {
            this.moveFocus(this.focused.cell.nextX(-1));
        }
        else if (e.which === 38) {
            this.moveFocus(this.focused.cell.nextY(-1));
        }
        else if (e.which === 39) {
            this.moveFocus(this.focused.cell.nextX(1));
        }
        else if (e.which === 40) {
            this.moveFocus(this.focused.cell.nextY(1));
        }
        else if (e.which === 8) {
            this.backspace();
        }
        else if (e.which === 32) {
            this.letter('');
        }
        else if (e.which === 46) {
            this.delete();
        }
        else if ((e.which > 64 && e.which < 91) || (e.which > 96 && e.which < 123)) {
            this.letter(String.fromCharCode(e.which));
        }
    }
    hookupKeyboard() {
        $("#keyboard span").click((e) => {
            if (!this.focused) {
                return;
            }
            var key = $(e.target).text();
            var action = $(e.target).data("action");
            if (key === 'BS') {
                this.backspace();
            }
            else if (key === 'DEL') {
                this.delete();
            }
            else if (action === 'prev') {
                this.moveFocus(this.crossword.clue(this.focused.id - 1).firstCell);
            }
            else if (action === 'next') {
                this.moveFocus(this.crossword.clue(this.focused.id + 1).firstCell);
            }
            else if (action === 'right') {
                this.moveFocus(this.focused.cell.nextX(1));
            }
            else if (action === 'up') {
                this.moveFocus(this.focused.cell.nextY(-1));
            }
            else if (action === 'left') {
                this.moveFocus(this.focused.cell.nextX(-1));
            }
            else if (action === 'down') {
                this.moveFocus(this.focused.cell.nextY(1));
            }
            else {
                this.letter(key);
            }
            this.moveFocus(this.focused.cell);
        });
    }
    hookupNotes() {
        $("#notes-input").blur((e) => {
            let note = $("#notes-input").val();
            this.crossword.clue(this.focused.id).note = note;
            this.fireNoteListeners(this.focused.id, note, false);
        });
        $("#notes-input").keyup((e) => {
            let note = $("#notes-input").val();
            this.crossword.clue(this.focused.id).note = note;
            this.fireNoteListeners(this.focused.id, note, true);
        });
    }
    fireNoteListeners(clueId, note, lock) {
        this.noteListeners.forEach(l => { l(clueId, note, lock); });
    }
    moveFocus(cell) {
        cell.cell.focus();
    }
    letterFocus(e, cell) {
        let direction = this.focused.direction;
        if (e.type === 'click' && this.focused && cell.id === this.focused.letter) {
            if (this.focused.id === cell.across && cell.down) {
                direction = CwClueDirection.down;
            }
            else if (this.focused.id === cell.down && cell.across) {
                direction = CwClueDirection.across;
            }
        }
        else if (this.focused && (this.focused.id === cell.down || this.focused.id === cell.across)) {
            direction = this.focused.direction;
        }
        else if (direction == CwClueDirection.across && !cell.across) {
            direction = CwClueDirection.down;
        }
        else if (direction == CwClueDirection.down && !cell.down) {
            direction = CwClueDirection.across;
        }
        this.focus(cell, direction);
    }
    focus(cell, direction) {
        this.focused.direction = direction;
        this.focused.id = direction == CwClueDirection.across ? cell.across : cell.down;
        this.focused.letter = cell.id;
        this.focused.cell = cell;
        let clue = this.crossword.clue(this.focused.id);
        $('.focus').removeClass('focus');
        $('#' + cell.id).addClass('focus');
        $('.highlight').removeClass('highlight');
        $('.c' + this.focused.id).addClass('highlight');
        $('body').toggleClass('down', direction == CwClueDirection.down);
        $('body').toggleClass('across', direction == CwClueDirection.across);
        $('#ic_number').text(clue.number);
        $('#ic_clue').text(clue.clue);
        $('#ic_format').text('(' + clue.format + ')');
        this.updateNote();
        this.fireLocationListeners(cell);
    }
    update(uuid, data) {
        console.log(data);
        for (let cellId in data.grid) {
            if (data.grid[cellId] && data.grid[cellId] !== null) {
                this.setLetter(this.crossword.cellFromId(cellId), data.grid[cellId].letter);
            }
        }
        if (data.notes) {
            for (let clueId in data.notes) {
                let clue = this.crossword.clue(parseInt(clueId));
                let note = data.notes[clueId].note;
                if (note !== undefined) {
                    clue.note = note;
                    clue.firstCell.cell.toggleClass('has-note', note.trim() != '');
                }
                let lockid = data.notes[clueId].lock;
                if (lockid !== undefined) {
                    clue.noteLocked = lockid != null && lockid != uuid;
                    clue.firstCell.cell.toggleClass('note-locked', clue.noteLocked);
                }
            }
        }
        if (data.solvers) {
            $('.watched').removeClass('watched');
            const keys = Object.keys(data.solvers);
            const now = new Date().getTime();
            for (const key of keys) {
                const solver = data.solvers[key];
                if (key != uuid && (now - solver.timestamp) < 300000) {
                    $('#' + solver.cellId).addClass('watched');
                }
            }
        }
        this.updateNote();
    }
    updateNote() {
        let el = $("#notes-input");
        if (!el.get(0).matches(":focus")) {
            let clue = this.crossword.clue(this.focused.id);
            let note = clue.note;
            if (clue.noteLocked) {
                el.attr('readonly', 'readonly');
            }
            else {
                el.removeAttr('readonly');
            }
            el.val(note ? note : '');
        }
    }
    registerNoteListener(listener) {
        this.noteListeners.push(listener);
    }
    registerLocationListener(listener) {
        this.locationListeners.push(listener);
    }
    registerAnswerListener(listener) {
        this.answerListeners.push(listener);
    }
}
class CwStorage {
    constructor(id) {
        this.patchData = {};
        this.id = id;
        this.data = {
            grid: {},
            solvers: {},
            notes: {}
        };
    }
    age() {
        return Math.floor((new Date().getTime() - this.refreshed.getTime()) / 1000);
    }
    fetch(callback, error) {
        if (Object.keys(this.patchData).length > 0) {
            this.pushActual(callback);
        }
        else {
            $.get("https://extendsclass.com/api/json-storage/bin/" + this.id + "?cb=" + new Date().getTime(), (data) => {
                this.updateData(JSON.parse(data), callback);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (error) {
                    error(errorThrown);
                }
                else {
                    //alert("Failed to load storage");
                    console.error("Failed to load storage - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
                }
            });
        }
    }
    pushLetter(key, value, callback) {
        let data = {
            grid: {}
        };
        data.grid[key] = {
            letter: value
        };
        this.push(data, callback);
    }
    pushNotes(key, value, lockuuid, callback) {
        let data = {
            notes: {}
        };
        data.notes[key] = {
            note: value,
            lock: lockuuid,
        };
        this.push(data, callback);
    }
    pushLocation(uuid, cellId, callback) {
        let data = {
            solvers: this.data.solvers
        };
        if (!data.solvers) {
            data.solvers = {};
        }
        if (!data.solvers[uuid]) {
            data.solvers[uuid] = {};
        }
        data.solvers[uuid].timestamp = new Date().getTime();
        data.solvers[uuid].cellId = cellId;
        data.solvers[uuid].version = "v001";
        this.push(data, callback);
    }
    push(data, callback) {
        this.patchData = this.merge(this.patchData, data);
    }
    merge(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object) {
                if (!target[key]) {
                    target[key] = {};
                }
                Object.assign(source[key], this.merge(target[key], source[key]));
            }
        }
        return Object.assign(target || {}, source);
    }
    diff(obj1, obj2) {
        if (this.isValue(obj1) || this.isValue(obj2)) {
            return this.compareValues(obj1, obj2);
        }
        let diff = {};
        for (let key in obj1) {
            let value2 = undefined;
            if (obj2[key] !== undefined) {
                value2 = obj2[key];
            }
            let diffValue = this.diff(obj1[key], value2);
            if (diffValue !== undefined) {
                diff[key] = diffValue;
            }
        }
        for (var key in obj2) {
            if (obj1[key] !== undefined) {
                continue;
            }
            diff[key] = this.diff(undefined, obj2[key]);
        }
        return Object.keys(diff).length == 0 ? undefined : diff;
    }
    compareValues(value1, value2) {
        if (value1 === value2) {
            return undefined;
        }
        if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
            return undefined;
        }
        if (value1 === undefined) {
            return value2;
        }
        if (value2 === undefined) {
            return null;
        }
        return value2;
    }
    isFunction(x) {
        return Object.prototype.toString.call(x) === '[object Function]';
    }
    isArray(x) {
        return Object.prototype.toString.call(x) === '[object Array]';
    }
    isDate(x) {
        return Object.prototype.toString.call(x) === '[object Date]';
    }
    isObject(x) {
        return Object.prototype.toString.call(x) === '[object Object]';
    }
    isValue(x) {
        return !this.isObject(x) && !this.isArray(x);
    }
    pushActual(callback) {
        let data = this.patchData;
        data['code'] = this.data.code;
        this.patchData = {};
        $.ajax({
            type: "PATCH",
            url: "https://extendsclass.com/api/json-storage/bin/" + this.id,
            data: JSON.stringify(data),
            success: (response) => {
                this.updateData(JSON.parse(response.data), callback);
            },
            error: () => {
                console.error("error: merging data back into patch data");
                this.patchData = this.merge(this.patchData, data);
                alert("couldn't update db");
            },
            contentType: "application/merge-patch+json",
            dataType: "json"
        });
    }
    save() {
        $.ajax({
            type: "PUT",
            url: "https://extendsclass.com/api/json-storage/bin/" + this.id,
            data: JSON.stringify(this.data),
            success: (response) => {
                console.log("Full data save for recovery");
            },
            error: () => { alert("couldn't update db"); },
            contentType: "application/json",
            dataType: "json"
        });
    }
    updateData(data, callback) {
        this.refreshed = new Date();
        if (data.code && data.grid && Object.keys(this.data.grid).length <= Object.keys(data.grid).length) {
            const diff = this.diff(this.data, data);
            if (diff !== undefined) {
                diff.solvers = data.solvers;
                callback(diff);
                this.data = data;
            }
        }
        else {
            if (this.data.code) {
                console.log("merging patch data into data");
                this.data = this.merge(this.data, this.patchData);
                console.log("saving");
                this.save();
            }
        }
    }
    static create(crossword, code, callback) {
        let data = { code: code, grid: {} };
        $.ajax({
            type: "POST",
            url: "https://extendsclass.com/api/json-storage/bin",
            data: JSON.stringify(data),
            success: (response) => { callback(response.id); },
            error: () => { alert("Couldn't create db"); },
            contentType: "application/json",
            dataType: "json"
        });
    }
}
class CwApp {
    constructor(id) {
        this.id = id;
        this.uuid = this.fetchUuid();
        $('body').addClass(this.hasId() ? 'has-id' : 'no-id');
    }
    start() {
        if (this.hasId()) {
            this.storage = new CwStorage(this.id);
            this.storage.fetch((data) => this.initBoard(data), this.showForm);
        }
        else {
            this.showForm();
        }
    }
    hasId() {
        return !!this.id;
    }
    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    fetchUuid() {
        let uuid;
        if (window.localStorage) {
            uuid = window.localStorage.getItem("cw-uuid");
        }
        else {
            uuid = this.getCookie("cw-uuid");
        }
        if (!uuid) {
            uuid = this.uuidv4();
            if (window.localStorage) {
                window.localStorage.setItem("cw-uuid", uuid);
            }
            else {
                this.setCookie("cw-uuid", uuid, 365);
            }
        }
        return uuid;
    }
    getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }
    setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
    initBoard(data) {
        $('body').addClass('has-id');
        if (data.data_url) {
            if (data.data_url.endsWith('.js')) {
                CwBoard.loadJs(data.data_url, this.initBoardComplete.bind(this));
            }
            else {
                CwBoard.loadXml(data.data_url, this.initBoardComplete.bind(this));
            }
        }
        else {
            CwBoard.loadIndependentXml(data.code, this.initBoardComplete.bind(this));
        }
    }
    initBoardComplete(board) {
        this.board = board;
        this.board.update(this.uuid, this.storage.data);
        this.board.registerAnswerListener(this.storageAnswerUpdate.bind(this));
        this.board.registerNoteListener(this.storageNoteUpdate.bind(this));
        this.board.registerLocationListener(this.storageLocationUpdate.bind(this));
        $("#title").text(this.board.crossword.title);
        this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 1000);
        this.focusId = window.setInterval(this.locationRefresh.bind(this), 150000);
        window.setInterval(this.ageRefresh.bind(this), 1000);
        document.addEventListener("visibilitychange", this.browserFocusListener.bind(this));
    }
    storageAnswerUpdate(cell, answer) {
        this.storage.pushLetter(cell.id, answer, (data) => {
            this.board.update(this.uuid, data);
        });
    }
    storageNoteUpdate(clueId, note, lock) {
        this.storage.pushNotes(clueId, note, lock ? this.uuid : null, (data) => {
            this.board.update(this.uuid, data);
        });
    }
    storageLocationUpdate(cell) {
        this.storage.pushLocation(this.uuid, cell.id, (data) => {
            this.board.update(this.uuid, data);
        });
    }
    browserFocusListener(e) {
        window.clearInterval(this.intervalId);
        window.clearInterval(this.focusId);
        if (document.visibilityState === 'visible') {
            this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 1000);
            this.focusId = window.setInterval(this.locationRefresh.bind(this), 150000);
            this.locationRefresh();
        }
        else {
            this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 60000);
        }
    }
    ageRefresh() {
        $("#last-refresh").text("Refreshed " + this.storage.age() + "s ago");
    }
    locationRefresh() {
        this.storage.pushLocation(this.uuid, this.board.focused.cell.id, null);
    }
    storageIntervalRefresh() {
        this.storage.fetch((data) => {
            this.board.update(this.uuid, data);
        });
    }
    showForm() {
        $('body').addClass('no-id');
        $('#cw-button').click(() => {
            let code = $('#cw-code').val();
            if (code !== '') {
                this.setCode(code);
            }
        });
    }
    setCode(code) {
        CwCrossword.loadIndependentXml(code, (cw) => {
            CwStorage.create(cw, code, this.createSuccess);
        });
    }
    createSuccess(id) {
        window.location.href += "#" + id;
        window.location.reload();
    }
}
let app = new CwApp(window.location.hash ? window.location.hash.substr(1) : null);
app.start();
//# sourceMappingURL=crossword.js.map