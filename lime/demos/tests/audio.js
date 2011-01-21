
// pg - "Pot Game"
goog.provide('test.audio')


goog.require('lime');
goog.require('lime.Director');
goog.require('lime.CoverNode');
goog.require('lime.Scene');
goog.require('lime.Layer');
goog.require('lime.Sprite');

goog.require('lime.Circle');
goog.require('lime.Button');
goog.require('lime.Label');
goog.require('lime.animation.MoveBy');
goog.require('lime.animation.ScaleBy');
goog.require('lime.animation.Spawn');
goog.require('lime.animation.Loop');
goog.require('lime.animation.Sequence');
goog.require('lime.audio.Audio');


test.WIDTH = 600;
test.HEIGHT = 400;


test.start = function(){ 
	
	//director
	test.director = new lime.Director(document.body,test.WIDTH,test.HEIGHT);
	test.director.makeMobileWebAppCapable();
	
	
	var menuscene = new lime.Scene;
	
	var layer = (new lime.Layer).setPosition(100,100);
	menuscene.appendChild(layer);
	
	
	var sprite = new lime.Sprite().setFill('#0c0').setSize(50,50);
	layer.appendChild(sprite);
	
	var anim = new lime.animation.Spawn(
	        new lime.animation.MoveBy(200,0).setDuration(1.5),
	        new lime.animation.ScaleBy(2)
	    );
	var a2 = new lime.animation.Sequence(anim,anim.reverse());
	sprite.runAction(new lime.animation.Loop(a2).setLimit(5));
	
	// set active scene
	test.director.replaceScene(menuscene);
	
	var audio = new lime.audio.Audio('../potgame_demos/water.m4a');
/*	
	goog.events.listen(sprite,['mousedown','touchstart'],function(){
	    audio.play();
	})*/
	setTimeout(function(){
	    audio.play();
	},3000);
	
}

goog.exportSymbol('test.start', test.start);