goog.provide('lime.animation.Animation');
goog.provide('lime.animation.Easing');
goog.provide('lime.animation.actionManager');


goog.require('lime.scheduleManager');
goog.require('goog.array');
goog.require('goog.events.EventTarget');
goog.require('goog.fx.easing');


/**
 * General object for running animations on nodes
 * @constructor
 * @extends {goog.events.EventTarget}
 */
lime.animation.Animation = function() {
    goog.events.EventTarget.call(this);

    /**
     * Array of active target nodes
     * @type {Array.<lime.Node>}
     * @protected
     */
    this.targets = [];

    this.targetProp_ = {};

    /**
     * Animation is playing?
     * @type {Boolean}
     * @private
     */
    this.isPlaying_ = false;

    this.duration_ = 1.0;

    this.ease = lime.animation.Easing.EASEINOUT;

    this.status_ = 0;

};
goog.inherits(lime.animation.Animation, goog.events.EventTarget);

/**
 * @type {string}
 * @const
 */
lime.animation.Animation.prototype.scope = '';


/**
 * Animation event types
 * @enum {number}
 */
lime.animation.Event = {
  START: 1,
  STOP: 2
};

/**
 * Return duration of the animation in seconds
 * @return {number} Animation duration.
 */
lime.animation.Animation.prototype.getDuration = function() {
    return this.duration_;
};

/**
 * Set the duration of the animation in seconds
 * @param {number} value New duration.
 * @return {lime.animation.Animation} object itself.
 */
 lime.animation.Animation.prototype.setDuration = function(value) {
     this.duration_ = value;
     return this;
 };
 
lime.animation.Animation.prototype.setEasing = function(ease) {
    this.ease = ease;
    return this;
};
lime.animation.Animation.prototype.getEasing = function(){
    return this.ease;
}

/**
 * Add target node to animation
 * @param {lime.Node} target Target node.
 * @return {lime.animation.Animation} object itself.
 */
lime.animation.Animation.prototype.addTarget = function(target) {
    goog.array.insert(this.targets, target);
    return this;
};

/**
 * Remove target node from animation
 * @param {lime.Node} target Node to be removed.
 * @return {lime.animation.Animation} object itself.
 */
lime.animation.Animation.prototype.removeTarget = function(target) {
    goog.array.remove(this.targets, target);
    return this;
};

/**
 * Start playing the animation
 */
lime.animation.Animation.prototype.play = function() {
    this.playTime_ = 0;
    this.status_ = 1;
    lime.scheduleManager.schedule(this.step_, this);
    this.dispatchEvent({type: lime.animation.Event.START});
};

/**
 * Stop playing the animtion
 */
lime.animation.Animation.prototype.stop = function() {
    if (this.status_ != 0) {
        if(this.useTransitions() && this.clearTransition){ 
            var i = this.targets.length;
            while (--i >= 0) {
                this.clearTransition(this.targets[i]);
            }
        }
        this.status_ = 0;
        lime.scheduleManager.unschedule(this.step_, this);
        this.dispatchEvent({type: lime.animation.Event.STOP});
    }
};

/**
 * Make property object for target that hold animation helper values.
 * @param {lime.Node} target Target node.
 * @return {object} Properties object.
 */
lime.animation.Animation.prototype.makeTargetProp = function(target) {
    return {};
};

/**
 * Get properties object for target.
 * @param {lime.Node} target Target node.
 * @return {object} Properties object.
 */
lime.animation.Animation.prototype.getTargetProp = function(target) {
    var uid = goog.getUid(target);
    if (!goog.isDef(this.targetProp_[uid])) {
        this.initTarget(target);
        this.targetProp_[uid] = this.makeTargetProp(target);
    }
    return this.targetProp_[uid];
};

/**
 * Initalize the aniamtion for a target
 * @param {lime.Node} target Target node.
 */
lime.animation.Animation.prototype.initTarget = function(target) {
    lime.animation.actionManager.register(this, target);
    this.status_ = 1;
};

/**
 * Get the director related to the animation targets.
 * @return {lime.Director} Director.
 */
lime.animation.Animation.prototype.getDirector = function() {
    return this.targets[0] ? this.targets[0].getDirector() : null;
};

/**
 * Iterate time for animation
 * @private
 * @param {number} dt Time difference since last run.
 */
lime.animation.Animation.prototype.step_ = function(dt) {

    this.playTime_ += dt;
    var t = this.playTime_ / (this.duration_ * 1000);
    if (t > 1) t = 1;
    var t_orig = t;
    var t = this.getEasing()[0](t);
    if(isNaN(t)){
        throw('Cubic equations with 3 roots not allowed atm.');
        t = t_orig;
    }
    if (t_orig == 1) t = 1;
    var i = this.targets.length;
    while (--i >= 0) {
        this.update(t, this.targets[i]);
    }

    if (t == 1) {
        this.stop();
    }
};

/**
 * Returns true if CSS transitions are used to make the animation.
 * Performes better on iOS devices.
 * @return {boolean} Transitions are being used?
 */
lime.animation.Animation.prototype.useTransitions = function() {
    return lime.style.isTransitionsSupported && this.optimizations_ //&&
        //goog.userAgent.MOBILE;
    // I see no boost on mac, only on ios
};

/**
 * Enable CSS3 transitions to make animation. Usually performes better
 * but is limited to single parallel transform action.
 * @param {boolean=} opt_value Enable or disable.
 * @return {lime.animation.Animation} object itself.
 */
lime.animation.Animation.prototype.enableOptimizations = function(opt_value) {
    var bool = goog.isDef(opt_value) ? opt_value : true;
    this.optimizations_ = bool;
    return this;
};

/**
 * Update targets to new values
 * @param {number} t Time position of animation[0-1].
 * @param {lime.Node} target Target node to update.
 */
lime.animation.Animation.prototype.update = goog.abstractMethod;


/**
 * ActionManager. Doesn't let animations that modify same parameters
 * run together on same targets.
 */
lime.animation.actionManager = new (function() {
    this.actions = {};
});

/**
 * Register animation in the manager.
 * @param {lime.animation.Animation} action Action.
 * @param {lime.Node} target Taget node.
 * @this {lime.animation.actionManager}
 */
lime.animation.actionManager.register = function(action, target) {
    //Todo: probably needs some garbage collection
    if (!action.scope.length) return;
    var id = goog.getUid(target);
    if (!goog.isDef(this.actions[id])) {
        this.actions[id] = {};
    }
    if (goog.isDef(this.actions[id][action.scope])) {
        this.actions[id][action.scope].stop();
    }
    this.actions[id][action.scope] = action;
};

/**
 * Stop all animations on target.
 * @param {lime.Node} target Target node.
 * @this {lime.animation.actionManager}
 */
lime.animation.actionManager.stopAll = function(target) {
    var id = goog.getUid(target);
    if (goog.isDef(this.actions[id])) {
        for (var i in this.actions[id]) {
            this.actions[id][i].stop();
        }
    }
};

lime.animation.solveCubic_ = function(a,b,c,d){
    var Q, R, H = 2*Math.pow(b,3)-9*a*b*c+27*a*a*d;
	Q = Math.sqrt(Math.pow(H,2)-4*Math.pow(b*b-3*a*c,3));
	R = Math.pow(.5*(Q+H),1/3);
	return -b/(3*a) - R/(3*a) - (b*b-3*a*c)/(3*a*R);
};

lime.animation.getEasingFunction = function(p1x,p1y,p2x,p2y){
    var A = -3*p1x + 3*p2x -1,
		B = 3*p1x - 6*p2x +3,
		C = 3*p2x -3,
		that = this;
    return [function(t){
		var t= that.solveCubic_(A,B,C,1-t);
		var y=p1y*3*t*t*(1-t) + p2y*3*t*(1-t)*(1-t) + (1-t)*(1-t)*(1-t);
		return y;
    },p1x,p1y,p2x,p2y];
    
}

// todo: This is not quite correct as the functions are bit different
// Real solution would involve generic cubic-bezier function in JS
lime.animation.Easing = {
    EASE        : lime.animation.getEasingFunction(0.25,0.1,.25,1),
    LINEAR      : lime.animation.getEasingFunction(.21,.2,.51,.58),
    EASEIN      : lime.animation.getEasingFunction(.76,.1,1,1),
    EASEOUT     : lime.animation.getEasingFunction(0.13,0.43,.4,.78),
    EASEINOUT   : lime.animation.getEasingFunction(.42,0,.58,1)
};


