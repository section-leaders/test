/*
 * File: codetrace.js
 * ------------------
 * This module is a prototype version of a code-tracing facility
 * for use in a browser with reveal.js slides.
 */

"use strict";

/*
 * Class: CodeTrace
 */

class CodeTrace {

    constructor(title) {
        this._element = document.createElement("div");
        this._element.className = "CodeTrace";
        this._title = title;
        this._functionTable = { };
        this._callStack = [ ];
        this._valueStack = [ ];
        this._queue = [ ];
        this._frameWidth = -1;
        this._frameHeight = CodeTrace.DEFAULT_FRAME_HEIGHT;
        this._frameDX = CodeTrace.DEFAULT_FRAME_DX;
        this._frameDY = CodeTrace.DEFAULT_FRAME_DY;
        this._pixelSF = 1;
        this._maxDepth = 1;
        this._callBase = -1;
        this._tracing = true;
        this._keepLastFrame = false;
        this._highlight = null;
        this._font = null;
        this._delay = 100;
        this.setParameters();
        this.defineFunctions();
        this.initControlStrip();
    }

/*
 * Method: setParameters
 * Usage: ct.setParameters();
 * --------------------------
 * Sets any parameters needed for the CodeTrace object.  Subclasses
 * override this method to change the parameter settings.
 */

    setParameters() {
        /* Empty */
    }

/*
 * Method: initControlStrip
 * Usage: ct.initControlStrip();
 * -----------------------------
 * Initializes the buttons defined for this demo.  Each button is in an
 * element whose id is the title concatenated with the button name.
 */

    initControlStrip() {
        let ct = this;
        this.initButton("Run", runAction);
        this.initButton("StepIn", stepInAction);
        this.initButton("StepOver", stepOverAction);
        this.initButton("Reset", resetAction);

        function runAction(e) {
            ct._tracing = false;
            ct.stepInAction();
            e.stopPropagation();
            ct._timer = setTimeout(step, 100);

            function step() {
                if (ct.getCallStackDepth() > 0) {
                    ct.stepInAction();
                    ct._timer = setTimeout(step, 100);
                }
            }
        }

        function stepInAction(e) {
            ct._tracing = true;
            ct.stepInAction();
            e.stopPropagation();
        }

        function stepOverAction(e) {
            ct._tracing = true;
            ct.stepOverAction();
            e.stopPropagation();
        }

        function resetAction(e) {
            ct._tracing = true;
            ct.reset();
            clearTimeout(ct._timer);
            e.stopPropagation();
        }

    }

/*
 * Method: defineFunctions
 * Usage: ct.defineFunctions();
 * ----------------------------
 * Defines the functions that can be called inside this CodeTrace demo.
 */

    defineFunctions() {
        /* Empty */
    }

/*
 * Method: install
 * Usage: ct.install(parent);
 * --------------------------
 * Installs the CodeTrace window in the specified parent.  The parent
 * may be either a DOM element or an id string.
 */

    install(parent) {
        if (parent === undefined) {
            parent = this._title;
        }
        if (typeof(parent) === "string" || parent instanceof String) {
            parent = document.getElementById(parent);
        }
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
        parent.appendChild(this._element);
    }

    installGWindow(id) {
        let element = document.getElementById(id);
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        let gw = GWindow(id);
        let canvas = gw._getCanvas();
        canvas.style.backgroundColor = "White";
        canvas.contentEditable = false;
        canvas.style.border = "none";
        return gw;
    }

/*
 * Method: reset
 * Usage: ct.reset();
 * ------------------
 * Resets the dynamic state of the CodeTrace object.
 */

    reset() {
        while (this._element.firstChild) {
            this._element.removeChild(this._element.firstChild);
        }
        this._callStack = [ ];
        this._valueStack = [ ];
        this._queue = [ ];
        this._callBase = -1;
        this.init();
        this.install();
        this.run();
    }

    init() {
        /* Empty */
    }

    run() {
        /* Empty */
    }

/*
 * Method: defineFunction
 * Usage: ct.defineFunction(name, f);
 * ----------------------------------
 * Defines a new function in this CodeTrace object.
 */

    defineFunction(name, f) {
        this._functionTable[name] = f;
    }

/*
 * Method: getFunction
 * Usage: let f = ct.getFunction(name);
 * ------------------------------------
 * Returns the named function or null.
 */

    getFunction(name) {
        return this._functionTable[name] || null;
    }

/*
 * Method: call
 * Usage: ct.call(name, ...args).then(...);
 * ----------------------------------------
 * Initiates a call to the named function and the supplied arguments.
 */

    async call(name, ...args) {
        let ct = this;
        let f = ct._functionTable[name];
        for (let arg of args) {
            ct.push(arg);
        }
        let cf = f.createFrame(this);
        ct.pushFrame(cf);
        if (ct._callStack.length > 1 && !ct.skippingCallTrace()
                                     && ct._tracing) {
            await new CTFlyInAnimation(cf).run();
        }
        let value = await f.run(this);
        if (ct._callStack.length > 1 || !ct._keepLastFrame) {
            if (!ct.skippingCallTrace() && ct._tracing) {
                new CTFadedZoomOutAnimation(cf).run();
            }
            ct.popFrame();
        }
        if (ct._tracing && ct._callStack.length > 0) {
            ct.getCurrentFrame().highlight(null);
        }
        return value;
    }

    setRunDelay(delay) {
        this._delay = delay;
    }

/*
 * Method: initButton
 * Usage: ct.initButton(name, action);
 * -----------------------------------
 * Initializes the named button to call the specified action.  The HTML
 * file must include an <img> tag whose id is the concatenation of the
 * CodeTrace title, the button name, and the string "Button".
 */

    initButton(name, action) {
        let button = document.getElementById(this._title + name + "Button");
        if (button) {
            button.addEventListener("mouseenter", mouseenterAction);
            button.addEventListener("mouseleave", mouseleaveAction);
            button.addEventListener("mousedown", mousedownAction);
            button.addEventListener("mouseup", mouseupAction);
            button.addEventListener("click", action);
        }

        function mouseenterAction(e) {
            button.src = "images/" + name + "Rollover.png";
            e.stopPropagation();
        }

        function mouseleaveAction(e) {
            button.src = "images/" + name + "Control.png";
            e.stopPropagation();
        }

        function mousedownAction(e) {
            button.src = "images/" + name + "Pressed.png";
            e.stopPropagation();
        }

        function mouseupAction(e) {
            button.src = "images/" + name + "Rollover.png";
            e.stopPropagation();
        }

    }

/*
 * Method: getTitle
 * Usage: let title = ct.getTitle();
 * ---------------------------------
 * Returns the title parameter.
 */

    getTitle() {
        return this._title;
    }

    setFrameDeltas(dx, dy) {
        this._frameDX = dx;
        this._frameDY = dy;
    }

/*
 * Method: getWidth
 * Usage: let width = ct.getWidth();
 * ---------------------------------
 * Returns the pixel width of the CodeTrace element.
 */

    getWidth() {
        return this._element.offsetWidth;
    }

/*
 * Method: getHeight
 * Usage: let height = ct.getHeight();
 * -----------------------------------
 * Returns the pixel height of the CodeTrace element.
 */

    getHeight() {
        return this._element.offsetHeight;
    }

/*
 * Method: getZoom
 * Usage: let zoom = ct.getZoom();
 * -------------------------------
 * Returns the zoom ratio for resized windows.
 */

    getZoom() {
        let slides = document.getElementsByClassName("slides")[0];
        if (slides) {
            let transform = window.getComputedStyle(slides).transform;
            return new DOMMatrix(transform).m11;
        } else {
            return 1.0;
        }
    }

    traceStep(key, fn) {
        if (fn === undefined) {
            fn = () => null;
        }
        if (this.skippingCallTrace()) {
            return fn(this);
        } else {
            if (this._tracing) {
                let cf = this.getCurrentFrame();
                if (cf) cf.highlight(key);
            }
            this._callBase = -1;
            return this.step(fn);
        }
    }

    async traceAndTag(key, fn) {
        let cf = this.getCurrentFrame();
        let v = await this.traceStep(key, fn)
        cf.addValueTag("" + v, key);
        return v;
    }

    step(fn) {
        let ct = this;
        return new Promise(function(resolve) {
                               ct._queue.push(function() {
                                                  resolve(fn(ct));
                                              });
                          });
    }

    stepInAction() {
        if (this._queue.length > 0) {
            let fn = this._queue.shift();
            fn(this);
        }
    }

    stepOverAction() {
        this._callBase = this._callStack.length;
        this.stepInAction();
    }

/*
 * Method: keepLastFrame
 * Usage: ct.keepLastFrame(flag);
 * ------------------------------
 * Sets whether the trace keeps the last frame on the screen.
 */

    keepLastFrame(flag) {
        this._keepLastFrame = flag;
    }

/*
 * Method: getCallStackDepth
 * Usage: let depth = ct.getCallStackDepth();
 * ------------------------------------------
 * Returns the number of frames pushed on the call stack.
 */

    getCallStackDepth() {
        return this._callStack.length;
    }

/*
 * Method: getCurrentFrame
 * Usage: let cf = ct.getCurrentFrame();
 * -------------------------------------
 * Returns the current stack frame.
 */

    getCurrentFrame() {
        return this._callStack[this._callStack.length - 1];
    }

/*
 * Method: getCallerFrame
 * Usage: let caller = ct.getCallerFrame();
 * ----------------------------------------
 * Returns the stack frame for the caller of this frame.
 */

    getCallerFrame() {
        return this._callStack[this._callStack.length - 2];
    }

/*
 * Method: pushFrame
 * Usage: ct.pushFrame(frame);
 * ---------------------------
 * Pushes a new frame on the stack.
 */

    pushFrame(frame) {
        let level = this._callStack.length;
        this._callStack.push(frame);
        let left = CodeTrace.MARGIN + level * this._frameDX;
        let top = CodeTrace.MARGIN + level * this._frameDY;
        frame._element.style.left = left + "px";
        frame._element.style.top = top + "px";
        if (this._tracing) {
            this._element.appendChild(frame._element);
        }
    }

/*
 * Method: popFrame
 * Usage: ct.popFrame();
 * ---------------------
 * Pops and discards the top frame on the call stack.
 */

    popFrame() {
        let frame = this._callStack.pop();
        if (this._tracing) {
            this._element.removeChild(frame._element);
        }
    }

/*
 * Method: push
 * Usage: ct.push(value);
 * ----------------------
 * Pushes a new value on the stack.
 */

    push(value) {
        this._valueStack.push(value);
    }

/*
 * Method: pop
 * Usage: ct.pop();
 * ----------------
 * Pops and returns the top value on the stack.
 */

    pop() {
        return this._valueStack.pop();
    }

/*
 * Method: peek
 * Usage: value = ct.peek();
 * -------------------------
 * Returns the top value on the stack without popping it.
 */

    peek() {
        return this._valueStack[this._valueStack.length - 1];
    }

/*
 * Method: setMaxStackDepth
 * Usage: ct.setMaxStackDepth(depth);
 * ----------------------------------
 * Sets the maximum call depth for this CodeTrace object.  This value
 * is used to compute the default frame width.
 */

    setMaxStackDepth(depth) {
        this._maxDepth = depth;
    }

/*
 * Method: getMaxStackDepth
 * Usage: let depth = ct.getMaxStackDepth();
 * -----------------------------------------
 * Returns the maximum call depth for this CodeTrace object.
 */

    getMaxStackDepth(depth) {
        return this._maxDepth;
    }

/*
 * Method: getMaxCallDepth
 * Usage: let depth = ct.getMaxCallDepth();
 * ----------------------------------------
 * Returns the maximum call depth for this CodeTrace object.
 */

    getMaxCallDepth(depth) {
        return this._maxDepth;
    }

/*
 * Method: setFrameDeltas
 * Usage: ct.setFrameDeltas(dx, dy);
 * ---------------------------------
 * Sets the displacements for each new frame.
 */

    setFrameDeltas(dx, dy) {
        this._frameDX = dx;
        this._frameDY = dy;
    }

/*
 * Method: setFrameWidth
 * Usage: ct.setFrameWidth(width);
 * -------------------------------
 * Sets a standard frame width for this CodeTrace object.  If this value
 * is not set, the frame width is calculated from the maximum depth.
 */

    setFrameWidth(width) {
        this._frameWidth = width;
    }

/*
 * Method: getFrameWidth
 * Usage: let width = ct.getFrameWidth();
 * --------------------------------------
 * Returns the frame width for this CodeTrace object.
 */

    getFrameWidth() {
        if (this._frameWidth !== -1) {
            return this._frameWidth;
        }
        let totalWidth = this._element.parentNode.offsetWidth -
                         2 * CodeTrace.MARGIN - 2 * CTStackFrame.BORDER_WIDTH;
        return totalWidth - this._maxDepth * this._frameDX;
    }

/*
 * Method: setFrameHeight
 * Usage: ct.setFrameHeight(height);
 * ---------------------------------
 * Sets a standard frame height for this CodeTrace object.
 */

    setFrameHeight(height) {
        this._frameHeight = height;
    }

/*
 * Method: getFrameHeight
 * Usage: let height = ct.getFrameHeight();
 * --------------------------------------
 * Returns the frame height for this CodeTrace object.
 */

    getFrameHeight() {
        return this._frameHeight;
    }

/*
 * Method: setTraceMode
 * Usage: ct.setTraceMode(flag);
 * -----------------------------
 * Sets whether this CodeTrace object is tracing calls in the program
 * window.
 */

    setTraceMode(flag) {
        this._tracing = flag;
    }

/*
 * Method: getTraceMode
 * Usage: let flag =  ct.getTraceMode();
 * -------------------------------------
 * Returns whether this CodeTrace object is tracing calls in the program
 * window.
 */

    getTraceMode(flag) {
        return this._tracing;
    }

/*
 * Private method: skippingCallTrace
 * Usage: if (ct.skippingCallTrace()) . . .
 * ----------------------------------------
 * Returns true if this CodeTrace object is skipping over calls rather
 * than stepping through them.
 */

    skippingCallTrace() {
        return this._callBase >= 0 && this._callStack.length > this._callBase;
    }

}

/*
 * Static method: registerFragmentEvent
 * Usage: CodeTrace.registerFragmentEvent(id, fn);
 * -----------------------------------------------
 * Registers a callback event for the fragment with the specified id.
 * When that fragment is shown, the CodeTrace package calls fn().
 */

CodeTrace.registerFragmentEvent = function(id, fn) {
    if (CodeTrace._fragmentTable === null) {
        CodeTrace._fragmentTable = { };
        Reveal.on("fragmentshown", fragmentShown);
    }
    CodeTrace._fragmentTable[id] = fn;

    function fragmentShown(e) {
        let id = e.fragment.id;
        if (id) {
            let fn = CodeTrace._fragmentTable[id];
            if (fn) {
                fn();
            }
        }
    }

};

CodeTrace.DEFAULT_FRAME_HEIGHT = 250;
CodeTrace.DEFAULT_FRAME_DX = 10;
CodeTrace.DEFAULT_FRAME_DY = 26;
CodeTrace.MARGIN = 5;
CodeTrace.REVEAL_SF = 2.0;

CodeTrace._fragmentTable = null;

/*
 * Class: CTFunction
 */

class CTFunction {

    constructor(html) {
        this._html = html;
        this._frameWidth = -1;
        this._frameHeight = -1;
        let start = html.indexOf("def</span> ") + "def</span> ".length;
        let finish = html.indexOf("(", start);
        this._name = html.substring(start, finish).replace(/<[^>]*>/g, "");
    }

    getHTML() {
        return this._html;
    }

    setFrameWidth(width) {
        this._frameWidth = width;
    }

    getFrameWidth(ct) {
        if (this._frameWidth !== -1) {
            return this._frameWidth;
        }
        return ct.getFrameWidth();
    }

    setFrameHeight(height) {
        this._frameHeight = height;
    }

    getFrameHeight(ct) {
        if (this._frameHeight !== -1) {
            return this._frameHeight;
        }
        return ct.getFrameHeight();
    }

    createFrame(ct) {
        return new CTStackFrame(ct, this);
    }

    async run(ct) {
        throw Error("No override for run");
    }

}

class CTStackFrame {

/*
 * Constructor: CTStackFrame
 * Usage: let frame = CTStackFrame(ct, f);
 * ---------------------------------------
 * Creates a new stack frame in the CodeTrace ct for the CTFunction f.
 */

    constructor(ct, f) {
        let element = document.createElement("div");
        element.className = "CTStackFrame";
        element.innerHTML = f.getHTML();
        let width = f.getFrameWidth(ct);
        let height = f.getFrameHeight(ct);
        element.style.width = width + "px";
        element.style.height = height + "px";
        this._width = width;
        this._height = height;
        this._variables = [ ];
        this._tags = { };
        this._symtab = { };
        this._element = element;
        this._oldHighlight = null;
        this._font = null;
        this._f = f;
        this._pc = "#0";
        this._result = undefined;
        this._tmps = { };
        this._ct = ct;
    }

/*
 * Method: getFunction
 * Usage: let f = frame.getFunction();
 * -----------------------------------
 * Returns the function object for this frame.
 */

    getFunction() {
        return this._f;
    }

/*
 * Method: getX
 * Usage: let x = frame.getX();
 * ----------------------------
 * Returns the x offset of the CTStackFrame element.
 */

    getX() {
        return parseFloat(this._element.style.left);
    }

/*
 * Method: getY
 * Usage: let y = frame.getY();
 * ----------------------------
 * Returns the y offset of the CTStackFrame element.
 */

    getY() {
        return parseFloat(this._element.style.top);
    }

/*
 * Method: getParent
 * Usage: let parent = frame.getParent();
 * --------------------------------------
 * Returns the CodeTrace object in which the frame is embedded.
 */

    getParent() {
        return this._ct;
    }

/*
 * Method: move
 * Usage: frame.move(dx, dy);
 * --------------------------
 * Adjusts the location by the specified displacements.
 */

    move(dx, dy) {
        let x = parseFloat(this._element.style.left) + dx;
        let y = parseFloat(this._element.style.top) + dy;
        this._element.style.left = x + "px";
        this._element.style.top = y + "px";
    }

/*
 * Method: setAlpha
 * Usage: frame.setAlpha(alpha);
 * -----------------------------
 * Sets the transparency for the CTStackFrame object.
 */

    setAlpha(alpha) {
        this._element.style.opacity = "" + alpha;
    }

/*
 * Method: setZoomFactor
 * Usage: frame.setZoomFactor(zoom);
 * ---------------------------------
 * Sets a zoom factor from the center of the frame.
 */

    setZoomFactor(zoom) {
        this._element.style.transform = "scale(" + zoom + ")";
    }

/*
 * Method: addVariable
 * Usage: cf.addVariable(v, width, height);
 * ----------------------------------------
 * Adds a variable to the stack frame.  If v is a string, this method
 * creates the variable.  The width and height parameters are optional.
 */

    addVariable(v, width, height) {
        if (typeof(v) === "string" || v instanceof String) {
            v = new CTVariable(v, width, height);
        }
        v.setStackFrame(this);
        this._variables.push(v);
        this._symtab[v.getName()] = v;
        this._element.appendChild(v._element);
        v.set(undefined);
    }

/*
 * Method: addArray
 * Usage: cf.addArray(array, x, y);
 * --------------------------------
 * Adds the CTArray to the CTFrame at the indicated position.
 */

    addArray(array, x, y) {
        array.setStackFrame(this);
        if (x !== undefined) array._element.style.left = x + "px";
        if (y !== undefined) array._element.style.top = y + "px";
        this._element.appendChild(array._element);
    }

/*
 * Method: getVariables
 * Usage: let variables = frame.getVariables();
 * --------------------------------------------
 * Returns a list of the variables defined in this frame.
 */

    getVariables() {
        return this._variables;
    }

/*
 * Method: getVariable
 * Usage: let v = frame.getVariable(name);
 * ---------------------------------------
 * Returns the variable with the specified name, or null.
 */

    getVariable(name) {
        return this._symtab[name] || null;
    }

/*
 * Method: get
 * Usage: let value = frame.get(name);
 * -----------------------------------
 * Returns the value of the variable with the specified name;
 */

    get(name) {
        if (this._symtab[name] !== undefined) {
            return this._symtab[name]._value;
        } else {
            throw new Error("No variable named " + name);
        }
    }

/*
 * Method: set
 * Usage: frame.set(name, value);
 * ------------------------------
 * Sets the value of the specified variable.
 */

    set(name, value) {
        if (this._symtab[name]) {
            this._symtab[name].set(value);
        } else {
            throw new Error("No variable named " + name);
        }
    }

/*
 * Method: setVisible
 * Usage: cf.setVisible(key, flag);
 * --------------------------------
 * Sets the visibility of the element with the specified key.
 */

    setVisible(key, flag) {
        let element = this.getElementByTag(key);
        if (element !== null) {
            element.style.visibility = (flag) ? "visible" : "hidden";
        }
    }

/*
 * Method: highlight
 * Usage: cf.highlight(key);
 * -------------------------
 * Highlights the element with the specified key after removing any
 * existing highlight.  If key is null, no new highlight is created.
 */

    highlight(key) {
        let old = this._ct._highlight;
        if (old !== null) {
            let className = old.className;
            let space = className.indexOf(" ");
            old.className = className.substring(0, space);
        }
        if (key === null) {
            this._ct._highlight = null;
        } else {
            let highlight = this.getElementByTag(key);
            if (highlight !== null) {
                highlight.className += " highlighted";
                this._ct._highlight = highlight;
            }
        }
    }

/*
 * Method: addValueTag
 * Usage: let tag = frame.addValueTag(html, key, width, height);
 * -------------------------------------------------------------
 * Adds a value tag with the specified HTML contents underneath the
 * element with the specified class key. The width and height
 * parameters are optional and set the size of the tag.  This method
 * returns the CTValueTag object.
 */

    addValueTag(html, key, width, height) {
        let tag = html;
        let sf = 1.0 / this._ct.getZoom();
        if (typeof(tag) === "string" || tag instanceof String) {
            tag = new CTValueTag(html, width, height);
        }
        let parent = key;
        if (typeof(parent) === "string" || parent instanceof String) {
            parent = this.getElementByTag(key);
        }
        if (parent === null) return;
        width = tag._width;
        if (width === undefined) {
            width = parent.offsetWidth;
        }
        height = tag._height;
        let frameBounds = this._element.getBoundingClientRect();
        let parentBounds = parent.getBoundingClientRect();
        let parentWidth = parentBounds.right - parentBounds.left;
        let mid = (parentBounds.left + parentBounds.right) / 2;
        let left = mid - frameBounds.left - parentWidth / 2 - 5;
        let top = parentBounds.bottom - frameBounds.top - 5;
        let tagStyle = tag._element.style;
        tagStyle.left = (left * sf) + "px";
        tagStyle.top = (top * sf) + "px";
        tagStyle.width = width + "px";
        if (height !== undefined) {
            tagStyle.height = height + "px";
        }
        this._tags[key] = tag;
        this._element.appendChild(tag._element);
        return tag;
    }

/*
 * Method: removeValueTag
 * Usage: frame.removeValueTag(tag);
 * ---------------------------------
 * Removes the value tag from the frame.  If tag is a string, this
 * method finds the tag that corresponds to that element.
 */

    removeValueTag(tag) {
        if (typeof(tag) === "string" || tag instanceof String) {
            tag = this._tags[tag];
        }
        this._element.removeChild(tag._element);
    }

    getElementByTag(tag) {
        let elements = this._element.getElementsByClassName(tag);
        if (elements.length === 0) {
            return null;
        }
        if (elements.length !== 1) {
            throw new Error("Class tag " + tag + " is not unique.");
        }
        return elements[0];
    }

/*
 * Method: layoutVariables
 * Usage: frame.layoutVariables();
 * -------------------------------
 * Repositions the variables so that they occupy the lower right
 * corner of the frame.
 */

    layoutVariables() {
        let x = this._width;
        for (let i = this._variables.length - 1; i >= 0; i--) {
            let v = this._variables[i];
            x -= v.getContentWidth() + CTStackFrame.VAR_SEP;
            v.setXLocation(x);
        }
    }

}

CTStackFrame.VAR_SEP = 12;
CTStackFrame.LEFT_MARGIN = 3;
CTStackFrame.TOP_MARGIN = 6;
CTStackFrame.BORDER_WIDTH = 10;  // Find this at runtime

class CTVariable {

    constructor(name, width, height) {
        width = (width === undefined) ? CTVariable.DEFAULT_WIDTH : width;
        height = (height === undefined) ? CTVariable.DEFAULT_HEIGHT : height;
        let element = document.createElement("div");
        element.className = "CTVariable";
        let label = document.createElement("div");
        label.innerHTML = name;
        label.className = "CTVarLabel";
        let contents = document.createElement("div");
        contents.className = "CTVarContents";
        contents.style.width = width + "px";
        contents.style.height = height + "px";
        element.appendChild(label);
        element.appendChild(contents);
        this._element = element;
        this._name = name;
        this._value = undefined;
        this._frame = null;
        this._label = label;
        this._width = width;
        this._height = height;
        this._contents = contents;
        this._quoteFlag = false;
    }

    set(value) {
        this._value = value;
        let html = "" + value;
        if (value === undefined) {
            html = "&nbsp;";
        } else if (this._quoteFlag) {
            html = '"' + html + '"';
        }
        let style = "vertical-align:middle; width:" + this._width + "px;" +
                    "height:" + this._height + "px;";
        html = "<table><tr><td style='" + style + "'>" + html +
               "</tr></td></table>";
        this._contents.innerHTML = html;
    }

    get() {
        return this._value;
    }

    getElement() {
        return this._element;
    }

    getName() {
        return this._name;
    }

    setQuoteFlag(flag) {
        this._quoteFlag = flag;
    }

    getQuoteFlag() {
        return this._quoteFlag;
    }

    setStackFrame(frame) {
        this._frame = frame;
    }

    setXLocation(x) {
        this._element.style.left = x + "px";
        this._element.style.bottom = CTVariable.BOTTOM_MARGIN + "px";
    }

    getContentWidth() {
        return this._width;
    }

    getContentHeight() {
        return this._height;
    }

}

CTVariable.DEFAULT_WIDTH = 80;
CTVariable.DEFAULT_HEIGHT = 28;
CTVariable.BOTTOM_MARGIN = 40;

class CTImageVariable extends CTVariable {

    constructor(name, width, height, sf=0.75) {
        super(name, width, height);
        this._sf = sf;
    }

    clearImage() {
        this._contents.innerHTML = "";
    }

    setImage(image) {
        let img = "<img src=\"" + image + "\" + style=\"width:" +
                  (this._width * this._sf) + "px; border-radius:0px;\">";
        let html = "<table><tbody style=\"border:none;\"><tr>" +
                   "<td style='text-align:center; vertical-align:middle;" +
                   "border:solid 2px black; width:" + this._width + "px;" +
                   "height:" + this._height + "px;'>" +
                   img + "</tr></td></tbody></table>";
        this._contents.innerHTML = html;
    }
}

class CTArray {

    constructor(name, n) {
        let element = document.createElement("div");
        element.className = "CTArray";
        let label = document.createElement("div");
        label.innerHTML = name;
        label.className = "CTArrayLabel";
        let table = document.createElement("table");
        table.className = "CTArrayTable";
        element.appendChild(table);
        let tbody = document.createElement("tbody");
        tbody.style = "border:none; border-collapse:collapse;";
        table.appendChild(tbody);
        let tr = document.createElement("tr");
        tbody.appendChild(tr);
        let elements = [ ];
        let values = [ ];
        for (let i = 0; i < n; i++) {
            let td = document.createElement("td");
            td.className = "CTArrayElement"
            elements[i] = td;
            tr.appendChild(td);
        }
        tr = document.createElement("tr");
        tbody.appendChild(tr);
        let indices = [ ];
        for (let i = 0; i < n; i++) {
            let td = document.createElement("td");
            td.innerHTML = "" + i;
            td.className = "CTArrayIndex"
            indices[i] = td;
            tr.appendChild(td);
        }
        this._name = name;
        this._n = n;
        this._element = element;
        this._label = label;
        this._elements = elements;
        this._values = values;
        this._indices = indices;
        this._quoteFlag = false;
    }

    length() {
        return this._n;
    }

    get(k) {
        return this._values[k];
    }

    set(k, value) {
        this._values[k] = value;
        let html = "" + value;
        if (value === undefined) {
            html = "&nbsp;";
        } else if (this._quoteFlag) {
            html = '"' + html + '"';
        }
        this._elements[k].innerHTML = html;
    }

    getElement() {
        return this._element;
    }

    getName() {
        return this._name;
    }

    setQuoteFlag(flag) {
        this._quoteFlag = flag;
    }

    getQuoteFlag() {
        return this._quoteFlag;
    }

    setStackFrame(frame) {
        this._frame = frame;
    }

}

/*
 * This class simulates a record structure.
 */

class CTRecord {

    constructor(width, height) {
        this._width = width;
        this._height = height;
        this._element = this.createRecordElement();
        this._attributeList = [ ];
        this._attributes = { };
        this._nextY = CTRecord.TOP_MARGIN;
    }

    getElement() {
        return this._element;
    }

    getWidth() {
        return this._width;
    }

    getHeight() {
        return this._height;
    }

    createRecordElement() {
        let element = document.createElement("div");
        element.className = "CTRecord";
        element.style.width = this._width + "px";
        element.style.height = this._height + "px";
        element.style.border = "solid 2px black";
        element.style.position = "absolute";
        return element;
    }

    addAttribute(v) {
        let ve = v._element;
        let x = (this._width - v.getContentWidth()) / 2;
        let y = this._nextY;
        this._nextY += v.getContentHeight() + CTRecord.DELTA_Y;
        this._attributeList.push(v);
        this._attributes[v.getName()] = v;
        ve.style.position = "absolute";
        ve.style.left = x + "px";
        ve.style.top = y + "px";
        this._element.appendChild(ve);
    }

    getAttribute(name) {
        return this._attributes.get(name);
    }

}

CTRecord.MARGIN = 20;
CTRecord.TOP_MARGIN = 5;
CTRecord.DELTA_Y = 65;

class CTValueTag {

    constructor(html, width, height) {
        let element = document.createElement("table");
        element.className = "CTValueTag";
        if (width !== undefined) {
            element.style.width = width;
        }
        let tbody = document.createElement("tbody");
        element.appendChild(tbody);
        let tr = document.createElement("tr");
        if (width !== undefined) {
            tr.style.width = width;
        }
        tbody.appendChild(tr);
        let td = document.createElement("td");
        td.style.width = "100%";
        td.innerHTML = html;
        tr.appendChild(td);
        this._element = element;
        this._width = width;
        this._height = height;
    }

}

class CTPointer {

    constructor(array) {
        this._array = array;
        let element = document.createElement("div");
        element.className = "CTPointer";
        element.innerHTML = "";
        let n = array.length;
        if (n === 2) {
            // Add later
        } else {
            let corner = "";
            for (let i = 1; i < n - 1; i++) {
                let x0 = array[i - 1][0];
                let y0 = array[i - 1][1];
                let x1 = array[i][0];
                let y1 = array[i][1];
                let x2 = array[i + 1][0];
                let y2 = array[i + 1][1];
                if (x0 === x1) {
                    if (i !== 1) y0 = (y0 + y1) / 2;
                    if (i !== n - 2) x2 = (x1 + x2) / 2;
                    if (x0 < x2) {
                        corner = (y0 < y2) ? "bottom-left" : "top-left";
                    } else {
                        corner = (y0 < y2) ? "bottom-right" : "top-right";
                    }
                } else {
                    if (i !== 1) x0 = (x0 + x1) / 2;
                    if (i !== n - 2) y2 = (y1 + y2) / 2;
                    if (y0 < y2) {
                        corner = (x0 < x2) ? "top-right" : "top-left";
                    } else {
                        corner = (x0 < x2) ? "bottom-right" : "bottom-left";
                    }
                }
                let x = Math.min(x0, x2);
                let y = Math.min(y0, y2);
                let w = Math.abs(x0 - x2);
                let h = Math.abs(y0 - y2);
                let borders = corner.split("-");
                element.innerHTML +=
                    "<div style='position:absolute; " +
                    "left:" + x + "px; top:" + y + "px; " +
                    "border-" + borders[0] + ":solid 2px black; " +
                    "border-" + borders[1] + ":solid 2px black; " +
                    "border-" + corner + "-radius:12px; " +
                    "width:" + w + "px; height:" + h + "px;'></div>";
            }
            element.innerHTML +=
                "<div style='position:absolute; " +
                "left:" + (array[0][0] - CTPointer.DOT_RADIUS) + "px; " +
                "top:" + (array[0][1] - CTPointer.DOT_RADIUS) + "px; " +
                "background-color:black; " +
                "border:solid 1px black; " +
                "border-radius:" + CTPointer.DOT_RADIUS + "px; " +
                "width:" + (2 * CTPointer.DOT_RADIUS) + "px; " +
                "height:" + (2 * CTPointer.DOT_RADIUS) + "px;'></div>";
// Only support right arrowhead for now (also bits of weirdness)
            let size = CTPointer.ARROW_SIZE;
            element.innerHTML +=
                "<div style='position:absolute; " +
                "left:" + (array[n - 1][0] - size - 1) + "px; " +
                "top:" + (array[n - 1][1] - 1.5 * size) + "px; " +
                "border-left:solid " + size + "px black; " +
                "border-top:solid " + size + "px transparent; " +
                "border-bottom:solid " + size + "px transparent; " +
                "width:" + (size + 4) + "px; " +
                "height:" + (size - 1) + "px;'></div>";
            
        }
        this._element = element;
    }

    getElement() {
        return this._element;
    }

}

CTPointer.DOT_RADIUS = 7;
CTPointer.ARROW_SIZE = 10;
        
class CTAnimationSequence {

    constructor() {
        this._timeline = [ ];
    }

}

class CTAnimation {

    constructor(target) {
        this._target = target;
    }

    getTarget() {
        return this._target;
    }

    async run() {
        throw new Error("Not defined in the base class");
    }

}

CTAnimation.TIME_STEP = 20;

class CTMoveAnimation extends CTAnimation {

    constructor(target, dx, dy, duration) {
        super(target);
        this._dx = dx;
        this._dy = dy;
        this._duration = duration;
    }

    async run() {
        let timeStep = CTAnimation.TIME_STEP;
        let nSteps = Math.floor(this._duration / timeStep);
        let xStep = this._dx / nSteps;
        let yStep = this._dy / nSteps;
        let target = this._target;
        for (let i = 0; i < nSteps; i++) {
            await new Promise(
                function(resolve) {
                    setTimeout(() => resolve(moveStep()), timeStep);
                });
        }

        function moveStep() {
            target.move(xStep, yStep);
        }
    }

}

class CTFlyInAnimation extends CTAnimation {

    constructor(target, dir, duration) {
        super(target);
// Implement only from SE for now.
        let parent = target.getParent();
        let xShift = parent.getWidth() - target.getX();
        let yShift = parent.getHeight() - target.getY();
        target.move(xShift, yShift);
        if (duration === undefined) {
            duration = 500;
        }
        this._xShift = xShift;
        this._yShift = yShift;
        this._duration = duration;
    }

    async run() {
        let timeStep = CTAnimation.TIME_STEP;
        let nSteps = Math.floor(this._duration / timeStep);
        let dx = -this._xShift / nSteps;
        let dy = -this._yShift / nSteps;
        let target = this._target;
        for (let i = 0; i < nSteps; i++) {
            await new Promise(
                function(resolve) {
                    setTimeout(() => resolve(moveStep()), timeStep);
                });
        }

        function moveStep() {
            target.move(dx, dy);
        }
    }

}

class CTFadeOutAnimation extends CTAnimation {

    constructor(target, duration) {
        super(target);
        let parent = target.getParent();
        if (duration === undefined) {
            duration = 500;
        }
        this._duration = duration;
    }

    async run() {
        let timeStep = CTAnimation.TIME_STEP;
        let nSteps = Math.floor(this._duration / timeStep);
        let target = this._target;
        for (let i = 1; i <= nSteps; i++) {
            await new Promise(
                function(resolve) {
                    setTimeout(() => resolve(fadeStep(i)), timeStep);
                });
        }

        function fadeStep(i) {
            target.setAlpha((nSteps - i) / nSteps);
        }
    }

}

class CTFadedZoomOutAnimation extends CTAnimation {

    constructor(target, duration) {
        super(target);
        let parent = target.getParent();
        if (duration === undefined) {
            duration = 500;
        }
        this._duration = duration;
    }

    async run() {
        let timeStep = CTAnimation.TIME_STEP;
        let nSteps = Math.floor(this._duration / timeStep);
        let target = this._target;
        for (let i = 1; i <= nSteps; i++) {
            await new Promise(
                function(resolve) {
                    setTimeout(() => resolve(fadedZoomStep(i)), timeStep);
                });
        }

        function fadedZoomStep(i) {
            target.setAlpha((nSteps - i) / nSteps);
            target.setZoomFactor((nSteps - i) / nSteps);
        }
    }

}
