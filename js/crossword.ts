enum CwClueDirection {
    across = 'across',
    down = 'down',
}

interface CwClue {
    id: number;
    number: string;
    format: string;
    clue: string;
    firstCell?: CwCell;
    note?: any;
    noteLocked?: boolean;
}

class CwCell {
    id: string;
    x: number;
    y: number;
    cw: CwCrossword;
    type: string;
    number: string;
    across?: number;
    down?: number;
    cell?: any;
    solution?: string;

    constructor(cw: CwCrossword, x: number, y: number) {
        this.cw = cw;
        this.x = x;
        this.y = y;
        this.type = 'block';
        this.id = x + '-' + y;
    }

    isBlock() : boolean {
        return this.type == 'block';
    }

    nextX(n: number) : CwCell {
        let cx = this.x - 1;
        for (let i = 1; i < this.cw.width; ++i) {
            let x = (cx + this.cw.width + (i * n)) % this.cw.width;
            let cell = this.cw.cell(x + 1, this.y);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    }

    nextY(n: number) : CwCell {
        let cy = this.y - 1;
        for (let i = 1; i < this.cw.height; ++i) {
            let y = (cy + this.cw.height + (i * n)) % this.cw.height;
            let cell = this.cw.cell(this.x, y + 1);
            if (cell.type === 'letter') {
                return cell;
            }
        }
    }

    next(n: number, direction: CwClueDirection, haltAtClueBoundary: boolean) : CwCell {
        let currentId;
        if (direction === CwClueDirection.across) {
            let cell = this.nextX(n);
            if (cell.across === this.across || cell.x > (this.x * n)) {
                return cell;
            }
            currentId = this.across;
        } else {
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

function _(json){
    console.log(json);
}

class CwCrossword {
    title: string;
    width: number;
    height: number;
    clues: Array<CwClue>;
    grid: Array<Array<CwCell>>;

    constructor(data: any) {
        let wordXml = data.find("word");
        this.title = $(data.find("metadata")).find("title").text();
        console.log("title=" + this.title);
        this.initClues(data.find("clue"), wordXml);
        this.initGrid(data.find("grid"), wordXml);
    }

    static loadXml(url: string, callback: (data: CwCrossword) => any, error?: (errorThrown : string) => void) : void {
        $.get(url, function (data) {
            callback(new CwCrossword($(data)));
        }).fail(function (jqXHR, textStatus, errorThrown) {
            if (error) {
                error(errorThrown);
            } else {
                alert("Failed to load crossword data");
                console.error("Failed to load crossword data - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
            }
        });
    }

    static loadJs(url: string, callback: (data: CwCrossword) => any, error?: (errorThrown : string) => void) : void {
        $.ajax({
            url: url,
            dataType: "jsonp",
        }).fail(function() {
            callback(new CwCrossword($(CrosswordPuzzleData)));
        });
    }

    static loadIndependentXml(code: String, callback: (data: CwCrossword) => any, error?: (errorThrown : string) => void) : void {
        this.loadXml(
            "https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml",
            callback,
            error);
    }

    clue(id: number) {
        if (id > this.clues.length) {
            id = 1;
        } else if (id < 1) {
            id = this.clues.length;
        }
        return this.clues[id - 1];
    }

    cell(x: number, y: number) : CwCell {
        return this.grid[x - 1][y - 1];
    }

    cellFromId(cellId: string) {
        const coord = cellId.split("-").map(n => parseInt(n));
        return this.cell(coord[0], coord[1]);
    }

    private initClues(cluesXml: any, wordXml: any) : void {
        this.clues = new Array(wordXml.length);
        cluesXml.each((i, node) => {
            let clueXml = $(node);
            let id = parseInt(clueXml.attr('word'));
            if (clueXml.attr('is-link')) {

            } else {
                this.clues[id - 1] = {
                    id: id,
                    number: clueXml.attr('number'),
                    format: clueXml.attr('format'),
                    clue: clueXml.text()
                }
            }
        });
    }

    private initGrid(gridXml: any, wordXml: any) : void {
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

    private wordToGrid(id: number, word: any, firstClue: boolean) : void {
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
        } else {
            for (let y = yl[0]; y <= yl[1]; ++y) {
                this.cell(xl[0], y).down = id;
                this.cell(xl[0], y).type = 'letter';
            }
        }
    }
}

interface CwCurrent {
    id?: number;
    letter?: string;
    cell?: CwCell;
    direction?: CwClueDirection;
}

class CwBoardCell {
    
}

class CwBoard {
    crossword: CwCrossword;
    focused: CwCurrent;
    gridContainer: JQuery;
    gridTable: JQuery;
    answerListeners: Array<(CwCell, string) => void> = [];
    locationListeners: Array<(CwCell) => void> = [];
    noteListeners: Array<(number, any, boolean) => void> = [];
    lettersTotal: number = 0;
    lettersFilled: number = 0;

    constructor(crossword: CwCrossword) {
        this.crossword = crossword;
        this.drawGrid();
        this.hookupKeyboard();
        this.hookupNotes();
        let firstCell = this.crossword.clue(1).firstCell;
        this.focused = {};
        this.focus(firstCell, firstCell.across ? CwClueDirection.across : CwClueDirection.down);
        this.moveFocus(this.crossword.clue(1).firstCell);
    }

    static loadXml(url: string, callback: (board: CwBoard) => any) : void {
        CwCrossword.loadXml(url, (cw: CwCrossword) => {
            callback(new CwBoard(cw));
        });
    }

    static loadJs(url: string, callback: (board: CwBoard) => any) : void {
        CwCrossword.loadJs(url, (cw: CwCrossword) => {
            callback(new CwBoard(cw));
        });
    }

    static loadIndependentXml(code: String, callback: (board: CwBoard) => any) : void {
        this.loadXml("https://ams.cdn.arkadiumhosted.com/assets/gamesfeed/independent/daily-crossword/" + code + ".xml", callback);
    }

    private drawGrid() {
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
                } else {
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
                    tableCell.focus((e) => { that.letterFocus(e, cell) });
                    tableCell.click((e) => { that.letterFocus(e, cell) });
                    tableCell.keydown((e) => { that.keyDownListener(e, cell) });
                }
                row.append(tableCell);
            }
            this.gridTable.append(row);
        }
    }

    private backspace() {
        this.setFocused('');
        this.moveFocus(this.focused.cell.next(-1, this.focused.direction, true));
    }

    private delete() {
        this.setFocused('');
    }

    private letter(letter: string) {
        this.setFocused(letter.toUpperCase());
        let nextCell = this.focused.cell.next(1, this.focused.direction, false);
        this.moveFocus(this.focused.cell.next(1, this.focused.direction, false));
    }

    private setLetter(cell: CwCell, value: string) {
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

    private getLetter(cell: CwCell) {
        let el = $("#" + cell.id + " .letter");
        return el.text();
    }

    private checkSolutions() {
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
        } else {
            el.removeClass("wrong right");
        }
    }

    private setFocused(value: string) {
        this.setLetter(this.focused.cell, value);
        this.fireAnswerListeners(this.focused.cell, value);
    }

    private fireAnswerListeners(cell: CwCell, answer: string) {
        this.answerListeners.forEach(l => { l(cell, answer); });
    }

    private fireLocationListeners(cell: CwCell) {
        this.locationListeners.forEach(l => { l(cell); });
    }

    private keyDownListener(e, cell: CwCell) {
        if (e.which === 37) {
            this.moveFocus(this.focused.cell.nextX(-1));
        } else if (e.which === 38) {
            this.moveFocus(this.focused.cell.nextY(-1));
        } else if (e.which === 39) {
            this.moveFocus(this.focused.cell.nextX(1));
        } else if (e.which === 40) {
            this.moveFocus(this.focused.cell.nextY(1));
        } else if (e.which === 8) {
            this.backspace();
        } else if (e.which === 32) {
            this.letter('');
        } else if (e.which === 46) {
            this.delete();
        } else if ((e.which > 64 && e.which < 91) || (e.which > 96 && e.which < 123)) {
            this.letter(String.fromCharCode(e.which));
        }
    }

    private hookupKeyboard() {
        $("#keyboard span").click((e) => {
            if (!this.focused) {
                return;
            }

            var key = $(e.target).text();
            var action = $(e.target).data("action");
            if (key === 'BS') {
                this.backspace();
            } else if (key === 'DEL') {
                this.delete();
            } else if (action === 'prev') {
                this.moveFocus(this.crossword.clue(this.focused.id - 1).firstCell);
            } else if (action === 'next') {
                this.moveFocus(this.crossword.clue(this.focused.id + 1).firstCell);
            } else if (action === 'right') {
                this.moveFocus(this.focused.cell.nextX(1));
            } else if (action === 'up') {
                this.moveFocus(this.focused.cell.nextY(-1));
            } else if (action === 'left') {
                this.moveFocus(this.focused.cell.nextX(-1));
            } else if (action === 'down') {
                this.moveFocus(this.focused.cell.nextY(1));
            } else {
                this.letter(key)
            }

            this.moveFocus(this.focused.cell);
        });
    }

    private hookupNotes() {
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

    private fireNoteListeners(clueId: number, note: any, lock: boolean) {
        this.noteListeners.forEach(l => { l(clueId, note, lock); });
    }

    private moveFocus(cell: CwCell) {
        cell.cell.focus();
    }

    private letterFocus(e, cell: CwCell) {
        let direction:CwClueDirection = this.focused.direction;
        if (e.type === 'click' && this.focused && cell.id === this.focused.letter) {
            if (this.focused.id === cell.across && cell.down) {
                direction = CwClueDirection.down;
            } else if (this.focused.id === cell.down && cell.across) {
                direction = CwClueDirection.across;
            }
        } else if (this.focused && (this.focused.id === cell.down || this.focused.id === cell.across)) {
            direction = this.focused.direction;
        } else if (direction == CwClueDirection.across && !cell.across) {
            direction = CwClueDirection.down;
        } else if (direction == CwClueDirection.down && !cell.down) {
            direction = CwClueDirection.across;
        }

        this.focus(cell, direction);
    }

    focus(cell: CwCell, direction: CwClueDirection) {
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

    update(uuid: string, data: CwData) {
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

    private updateNote() {
        let el = $("#notes-input");
        if(!el.get(0).matches(":focus")) {
            let clue = this.crossword.clue(this.focused.id);
            let note = clue.note;
            if (clue.noteLocked) {
                el.attr('readonly','readonly');
            } else {
                el.removeAttr('readonly');
            }
            el.val(note ? note : '');
        }
    }

    registerNoteListener(listener: (clueId: number, note: any, lock: boolean) => void) {
        this.noteListeners.push(listener);
    }

    registerLocationListener(listener: (cell: CwCell) => void) {
        this.locationListeners.push(listener);
    }

    registerAnswerListener(listener: (cell: CwCell, answer: string) => void) {
        this.answerListeners.push(listener);
    }
}

interface CwDataCell {
    letter: string;
}

interface CwData {
    data_url?: string;
    code?: string;
    url?: string;
    grid?: object;
    notes?: object;
    solvers?: object;
}

class CwStorage {
    id: string;
    data: CwData;
    refreshed: Date;
    patchData: object = {};

    constructor(id: string) {
        this.id = id;
        this.data = {};
    }

    age() {
        return Math.floor((new Date().getTime() - this.refreshed.getTime()) / 1000);
    }

    fetch(callback: (data : CwData) => void, error?: (errorThrown : string) => void) {
        if (Object.keys(this.patchData).length > 0) {
            this.pushActual(callback);
        } else {
            $.get("https://extendsclass.com/api/json-storage/bin/" + this.id + "?cb=" + new Date().getTime(), (data) => {
                this.updateData(JSON.parse(data), callback);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (error) {
                    error(errorThrown);
                } else {
                    //alert("Failed to load storage");
                    console.error("Failed to load storage - textStatus=" + textStatus + ", errorThrown=" + errorThrown);
                }
            });
        }
    }

    pushLetter(key, value, callback: (data : CwData) => void) {
        let data = {
            grid: {}
        };

        data.grid[key] = {
            letter: value
        };

        this.push(data, callback);
    }

    pushNotes(key, value, lockuuid: string, callback: (data : CwData) => void) {
        let data = {
             notes: {}
        };

        data.notes[key] = {
            note: value,
            lock: lockuuid,
        };

        this.push(data, callback);
    }

    pushLocation(uuid, cellId, callback: (data : CwData) => void) {
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

    push(data: object, callback: (data : CwData) => void) {
        this.patchData = this.merge(this.patchData, data);
    }

    private merge(target: object, source: object) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object) {
                if (!target[key]) {
                    target[key] = {};
                }
                (<any>Object).assign(source[key], this.merge(target[key], source[key]))
            }
        }

        return (<any>Object).assign(target || {}, source);
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

        return (<any>Object).keys(diff).length == 0 ? undefined : diff;
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

    private pushActual(callback: (data : CwData) => void) {
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

    private updateData(data, callback: (data : CwData) => void) {
        this.refreshed = new Date();
        if (data.code) {
            const diff = this.diff(this.data, data);
            if (diff !== undefined) {
                diff.solvers = data.solvers;
                callback(diff);
                this.data = data;
            }
        } else {
            if (this.data.code) {
                // console.log("merging patch data into data");
                // this.data = this.merge(this.data, this.patchData);
                // console.log("saving");
                // this.save();
            }
        }
    }

    static create(crossword: CwCrossword, code: string, callback: (id: string) => void) {
        let data: CwData = { code: code, grid: {}};

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
    id: string;
    storage: CwStorage;
    board: CwBoard;
    uuid: string;
    intervalId: number;
    focusId: number;

    constructor(id: string) {
        this.id = id;
        this.uuid = this.fetchUuid();
        $('body').addClass(this.hasId() ? 'has-id' : 'no-id');
    }

    start() {
        if (this.hasId()) {
            this.storage = new CwStorage(this.id);
            this.storage.fetch((data) => this.initBoard(data), this.showForm);
        } else {
            this.showForm();
        }
    }

    hasId() : boolean {
        return !!this.id;
    }

    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private fetchUuid() {
        let uuid;
        if (window.localStorage) {
            uuid = window.localStorage.getItem("cw-uuid");
        } else {
            uuid = this.getCookie("cw-uuid");
        }

        if (!uuid) {
            uuid = this.uuidv4();
            if (window.localStorage) {
                window.localStorage.setItem("cw-uuid", uuid);
            } else {
                this.setCookie("cw-uuid", uuid, 365);
            }
        }

        return uuid;
    }

    private getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
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

    private setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    private initBoard(data: CwData) {
        $('body').addClass('has-id');
        if (data.data_url) {
            if (data.data_url.endsWith('.js')) {
                CwBoard.loadJs(data.data_url, this.initBoardComplete.bind(this));
            } else {
                CwBoard.loadXml(data.data_url, this.initBoardComplete.bind(this));
            }
        } else {
            CwBoard.loadIndependentXml(data.code, this.initBoardComplete.bind(this));
        }
    }

    private initBoardComplete(board: CwBoard) {
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

    private storageAnswerUpdate(cell: CwCell, answer: string) {
        this.storage.pushLetter(cell.id, answer, (data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private storageNoteUpdate(clueId: number, note: string, lock: boolean) {
        this.storage.pushNotes(clueId, note, lock ? this.uuid : null, (data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private storageLocationUpdate(cell: CwCell) {
        this.storage.pushLocation(this.uuid, cell.id, (data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private browserFocusListener(e) {
        window.clearInterval(this.intervalId);
        window.clearInterval(this.focusId);
        if (document.visibilityState === 'visible') {
            this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 1000);
            this.focusId = window.setInterval(this.locationRefresh.bind(this), 150000);
            this.locationRefresh();
        } else {
            this.intervalId = window.setInterval(this.storageIntervalRefresh.bind(this), 60000);
        }
    }

    private ageRefresh() {
        $("#last-refresh").text("Refreshed " + this.storage.age() + "s ago");
    }

    private locationRefresh() {
        this.storage.pushLocation(this.uuid, this.board.focused.cell.id, null);
    }

    private storageIntervalRefresh() {
        this.storage.fetch((data: CwData) => {
            this.board.update(this.uuid, data);
        });
    }

    private showForm() {
        $('body').addClass('no-id');
        $('#cw-button').click(() => {
            let code = $('#cw-code').val();
            if (code !== '') {
                this.setCode(code);
            }
        });

    }

    private setCode(code: any) {
        CwCrossword.loadIndependentXml(code, (cw: CwCrossword) => {
            CwStorage.create(cw, code, this.createSuccess);
        });
    }

    private createSuccess(id: string) {
        window.location.href += "#" + id;
        window.location.reload();
    }
}

let app:CwApp = new CwApp(window.location.hash ? window.location.hash.substr(1) : null);
app.start();
