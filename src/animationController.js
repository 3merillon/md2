import { ANIMS } from './md2.js';

export class AnimationController {
  constructor() {
    // Character state
    this.stance = 'standing'; // 'standing' or 'crouching'
    this.isMoving = false;
    this.isJumping = false;
    this.isDead = false;
    
    // Current animations
    this.currentBaseAnimation = 'stand';
    this.targetBaseAnimation = 'stand';
    this.currentOneShot = null;
    this.currentJump = null;
    this.currentDeath = null;

    // Landing decision (base picked at landing)
    this.landingBaseAnimation = null;
    this.landingBaseAnimTime = 0;
    
    // Animation states
    this.isPlayingOneShot = false;
    this.isPlayingDeath = false;
    
    // Animation timing
    this.baseAnimTime = 0;
    this.targetBaseAnimTime = 0;
    this.oneShotTime = 0;
    this.jumpTime = 0;
    this.deathTime = 0;
    this.blendTime = 0;
    
    // Blend settings
    this.stanceBlendDuration = 0.2; // Fast stance changes
    this.movementBlendDuration = 0.3; // Movement transitions
    this.oneShotBlendDuration = 0.25; // Quick combat actions
    this.jumpBlendDuration = 0.15; // Very fast jump transitions
    this.deathBlendDuration = 0.4; // Dramatic death transitions

    // Pick landing target at the last jump frame (configurable)
    this.jumpReturnAt = 1.0; // 1.0 means "at landing frame" (see updateJump state below)
    
    // Blend states
    this.blendState = 'base'; // 'base', 'blending_base', 'blending_to_oneshot', 'oneshot', 'blending_to_base', 'blending_to_jump', 'jump', 'blending_from_jump', 'blending_to_death', 'death'
    this.blendFactor = 0.0;
    
    // Animation categories by stance
    this.standingAnimations = {
      idle: 'stand',
      moving: 'run',
      oneShots: ['attack', 'pain1', 'pain2', 'pain3', 'flip', 'salute', 'taunt', 'wave', 'point'],
      deaths: ['death1', 'death2', 'death3']
    };
    
    this.crouchingAnimations = {
      idle: 'crstnd',
      moving: 'crwalk',
      oneShots: ['crattack', 'crpain'],
      deaths: ['crdeath']
    };
    
    this.jumpAnimations = ['jump']; // Special category
    
    // Repeat handling
    this.lastOneShotPlayed = null;
    this.lastOneShotTime = 0;
    this.oneShotCooldown = 0.1;
    this.allowOneShotRestart = true;
    
    // Jump handling
    this.jumpInterruptible = false; // Can be interrupted by death only

    // Optional external movement state callback (e.g., from keyboard manager)
    this.getMovementStateCallback = null;
  }

  // Read current movement intent (live)
  readCurrentMoving() {
    if (typeof this.getMovementStateCallback === 'function') {
      try {
        return !!this.getMovementStateCallback();
      } catch {
        return this.isMoving;
      }
    }
    return this.isMoving;
  }
  
  // Stance control
  setStance(newStance) {
    if (this.isDead || this.isJumping) return; // Can't change stance while dead or jumping
    
    if (newStance !== this.stance) {
      this.stance = newStance;
      this.updateBaseAnimation();
    }
  }
  
  // Movement control
  setMovement(moving) {
    // Allow movement intent updates during jump so landing base reflects current input.
    if (this.isDead) return;
    
    if (moving !== this.isMoving) {
      this.isMoving = moving;
      // Update the desired base animation immediately; transition will apply when back on base
      this.updateBaseAnimation();
    }
  }
  
  // Combined stance and movement control
  setStanceAndMovement(stance, moving) {
    if (this.isDead || this.isJumping) return;
    
    const stanceChanged = stance !== this.stance;
    const movementChanged = moving !== this.isMoving;
    
    if (stanceChanged || movementChanged) {
      this.stance = stance;
      this.isMoving = moving;
      this.updateBaseAnimation();
    }
  }

  // External callback to read live movement state (e.g. WASD)
  setMovementStateCallback(callback) {
    this.getMovementStateCallback = callback;
  }
  
  // Update base animation based on stance and movement
  updateBaseAnimation() {
    // Prefer live input state if callback provided
    let currentMoving = this.readCurrentMoving();
    
    let newBaseAnim;
    
    if (this.stance === 'standing') {
      newBaseAnim = currentMoving ? this.standingAnimations.moving : this.standingAnimations.idle;
    } else { // crouching
      newBaseAnim = currentMoving ? this.crouchingAnimations.moving : this.crouchingAnimations.idle;
    }
    
    if (newBaseAnim !== this.targetBaseAnimation) {
      this.targetBaseAnimation = newBaseAnim;
      this.targetBaseAnimTime = 0;
      
      // Only start base-to-base blending when we're already on the base layer
      if (this.blendState === 'base') {
        this.blendState = 'blending_base';
        this.blendTime = 0;
        this.blendFactor = 0.0;
      }
    }
  }
  
  // Play stance-appropriate one-shot animation
  playOneShot(animName) {
    if (this.isDead) return;
    
    // Check if animation is valid for current stance
    const validAnims = this.stance === 'standing' ? 
      this.standingAnimations.oneShots : 
      this.crouchingAnimations.oneShots;
      
    if (!validAnims.includes(animName)) {
      // ignore silently to avoid console noise
      return;
    }
    
    // Handle jump interruption
    if (this.isJumping && !this.jumpInterruptible) {
      return;
    }
    
    const currentTime = performance.now() / 1000;
    
    // Smart repeat handling
    if (this.lastOneShotPlayed === animName) {
      const timeSinceLastPlay = currentTime - this.lastOneShotTime;
      
      if (timeSinceLastPlay < this.oneShotCooldown) {
        return; // Too soon
      }
      
      if (this.isPlayingOneShot && this.currentOneShot === animName && this.allowOneShotRestart) {
        this.oneShotTime = 0;
        this.blendTime = 0;
        this.lastOneShotTime = currentTime;
        return;
      }
    }
    
    // Start new one-shot
    this.currentOneShot = animName;
    this.oneShotTime = 0;
    this.blendTime = 0;
    this.isPlayingOneShot = true;
    this.lastOneShotPlayed = animName;
    this.lastOneShotTime = currentTime;
    
    // Handle jump interruption
    if (this.isJumping) {
      this.isJumping = false;
      this.currentJump = null;
    }
    
    if (this.blendState === 'base' || this.blendState === 'blending_base') {
      this.blendState = 'blending_to_oneshot';
      this.blendFactor = 0.0;
    } else if (this.blendState === 'jump' || this.blendState === 'blending_from_jump') {
      this.blendState = 'blending_to_oneshot';
      this.blendFactor = 0.0;
    } else {
      // Switch one-shots
      this.blendState = 'blending_to_oneshot';
      this.blendFactor = 0.0;
    }
  }
  
  // Play jump animation (special handling)
  playJump() {
    if (this.isDead) return;
    
    // Jump can interrupt most things except death
    this.currentJump = 'jump';
    this.jumpTime = 0;
    this.blendTime = 0;
    this.isJumping = true;

    // Reset landing selection for this jump
    this.landingBaseAnimation = null;
    this.landingBaseAnimTime = 0;
    
    // Clear one-shot if playing
    if (this.isPlayingOneShot) {
      this.isPlayingOneShot = false;
      this.currentOneShot = null;
    }
    
    this.blendState = 'blending_to_jump';
    this.blendFactor = 0.0;
  }
  
  // Play stance-appropriate death animation
  playDeath(animName) {
    // Check if animation is valid for current stance
    const validDeaths = this.stance === 'standing' ? 
      this.standingAnimations.deaths : 
      this.crouchingAnimations.deaths;
      
    if (!validDeaths.includes(animName)) {
      return;
    }
    
    // Death interrupts everything
    this.currentDeath = animName;
    this.deathTime = 0;
    this.blendTime = 0;
    this.isDead = true;
    this.isPlayingDeath = true;
    this.isPlayingOneShot = false;
    this.isJumping = false;
    this.currentOneShot = null;
    this.currentJump = null;
    
    this.blendState = 'blending_to_death';
    this.blendFactor = 0.0;
  }
  
  // Reset from death — pick the correct base immediately (like jump landing / oneshot return)
  resurrect() {
    // Clear death/oneshot/jump state
    this.isDead = false;
    this.isPlayingDeath = false;
    this.currentDeath = null;
    this.deathTime = 0;

    this.isPlayingOneShot = false;
    this.currentOneShot = null;
    this.oneShotTime = 0;

    this.isJumping = false;
    this.currentJump = null;
    this.jumpTime = 0;

    this.landingBaseAnimation = null;
    this.landingBaseAnimTime = 0;

    // Choose stance (default to standing) but keep current stance if you prefer
    this.stance = 'standing';

    // Read live input state at the exact moment of resurrect
    const movingNow = this.readCurrentMoving();
    this.isMoving = movingNow;

    // Pick the immediate base based on current stance + input
    const base = (this.stance === 'standing')
      ? (movingNow ? this.standingAnimations.moving : this.standingAnimations.idle)
      : (movingNow ? this.crouchingAnimations.moving : this.crouchingAnimations.idle);

    // Lock both current and target to this base to avoid any flash of the old anim
    this.currentBaseAnimation = base;
    this.targetBaseAnimation = base;
    this.baseAnimTime = 0;
    this.targetBaseAnimTime = 0;

    // Fully reset blending so we are cleanly on base
    this.blendState = 'base';
    this.blendFactor = 0.0;
    this.blendTime = 0.0;
  }
  
  // Update animation state
  update(deltaTime, animationSpeed = 1.0) {
    const frameRate = 6.0;
    const adjustedDelta = deltaTime * animationSpeed * frameRate;
    
    this.blendTime += deltaTime;
    
    // Update animation times
    this.baseAnimTime += adjustedDelta;
    this.targetBaseAnimTime += adjustedDelta;
    
    if (this.isPlayingOneShot) {
      this.oneShotTime += adjustedDelta;
    }
    if (this.isJumping || this.blendState === 'jump' || this.blendState === 'blending_from_jump') {
      this.jumpTime += adjustedDelta;
    }
    if (this.isPlayingDeath) {
      this.deathTime += adjustedDelta;
    }
    
    this.updateBlendState();
    return this.getCurrentAnimationData();
  }
  
  updateBlendState() {
    switch (this.blendState) {
      case 'blending_base': {
        const baseDuration = this.getBaseBlendDuration();
        this.blendFactor = Math.min(1.0, this.blendTime / baseDuration);
        if (this.blendFactor >= 1.0) {
          this.currentBaseAnimation = this.targetBaseAnimation;
          this.baseAnimTime = this.targetBaseAnimTime;
          this.blendState = 'base';
          this.blendFactor = 0.0;
        }
        break;
      }
        
      case 'blending_to_oneshot':
        this.blendFactor = Math.min(1.0, this.blendTime / this.oneShotBlendDuration);
        if (this.blendFactor >= 1.0) {
          this.blendState = 'oneshot';
        }
        break;
        
      case 'oneshot': {
        const oneShotRange = ANIMS[this.currentOneShot];
        const oneShotLength = oneShotRange.end - oneShotRange.start + 1;

        // During one-shot, allow UI/inputs to update intent (isMoving) but do not change base yet.
        if (this.oneShotTime >= oneShotLength) {
          // Pick the return base ONCE, based on the latest input/state (like jump landing).
          const movingNow = this.readCurrentMoving();
          this.isMoving = movingNow; // keep internal state in sync

          const returnBase = (this.stance === 'standing')
            ? (movingNow ? this.standingAnimations.moving : this.standingAnimations.idle)
            : (movingNow ? this.crouchingAnimations.moving : this.crouchingAnimations.idle);

          // Lock base to the return target immediately.
          this.currentBaseAnimation = returnBase;
          this.baseAnimTime = 0;

          // Keep target in sync; if input changes during the fade, we'll transition after we're back on base.
          this.targetBaseAnimation = returnBase;
          this.targetBaseAnimTime = 0;

          this.blendState = 'blending_to_base';
          this.blendTime = 0;
          // isPlayingOneShot turns false; currentOneShot remains valid for sampling until blend completes
          this.isPlayingOneShot = false;
        }
        break;
      }
        
      case 'blending_to_base':
        this.blendFactor = Math.max(0.0, 1.0 - (this.blendTime / this.oneShotBlendDuration));
        if (this.blendFactor <= 0.0) {
          this.blendState = 'base';
          this.currentOneShot = null;

          // If the user changed input during the fade back, smoothly transition after we're on base.
          this.updateBaseAnimation();
          if (this.currentBaseAnimation !== this.targetBaseAnimation) {
            this.blendState = 'blending_base';
            this.blendTime = 0;
            this.blendFactor = 0.0;
          }
        }
        break;
        
      case 'blending_to_jump':
        this.blendFactor = Math.min(1.0, this.blendTime / this.jumpBlendDuration);
        if (this.blendFactor >= 1.0) {
          this.blendState = 'jump';
        }
        break;
        
      case 'jump': {
        // Decide the landing fade at landing frame.
        const jumpRange = ANIMS[this.currentJump];
        const jumpLength = jumpRange.end - jumpRange.start + 1;

        // If jumpReturnAt is 1.0 => begin at the last frame (landing moment).
        // Otherwise, allow early return based on fraction if configured.
        const startReturnAt = Math.max(0.0, Math.min(1.0, this.jumpReturnAt));
        const exitThreshold = (startReturnAt >= 1.0) ? (jumpLength - 1) : (jumpLength * startReturnAt);

        if (this.jumpTime >= exitThreshold) {
          // Pick the landing base ONCE, based on the latest input/state.
          const movingNow = this.readCurrentMoving();
          this.isMoving = movingNow;

          const landingBase = (this.stance === 'standing')
            ? (movingNow ? this.standingAnimations.moving : this.standingAnimations.idle)
            : (movingNow ? this.crouchingAnimations.moving : this.crouchingAnimations.idle);

          this.landingBaseAnimation = landingBase;
          this.landingBaseAnimTime = 0;

          // Lock base to the landing target immediately.
          this.currentBaseAnimation = this.landingBaseAnimation;
          this.baseAnimTime = this.landingBaseAnimTime;

          // Keep target in sync.
          this.targetBaseAnimation = this.landingBaseAnimation;
          this.targetBaseAnimTime = 0;

          this.blendState = 'blending_from_jump';
          this.blendTime = 0;
          this.blendFactor = 1.0; // start fully on jump, fade to base
          this.isJumping = false; // UI can enable stance buttons during blend back
        }
        break;
      }
        
      case 'blending_from_jump':
        this.blendFactor = Math.max(0.0, 1.0 - (this.blendTime / this.jumpBlendDuration));
        if (this.blendFactor <= 0.0) {
          this.blendState = 'base';
          this.currentJump = null;

          // If user changed input during the landing fade, smoothly transition after landing.
          this.updateBaseAnimation();
          if (this.currentBaseAnimation !== this.targetBaseAnimation) {
            this.blendState = 'blending_base';
            this.blendTime = 0;
            this.blendFactor = 0.0;
          }
        }
        break;
        
      case 'blending_to_death':
        this.blendFactor = Math.min(1.0, this.blendTime / this.deathBlendDuration);
        if (this.blendFactor >= 1.0) {
          this.blendState = 'death';
        }
        break;
        
      case 'death': {
        const deathRange = ANIMS[this.currentDeath];
        const deathLength = deathRange.end - deathRange.start + 1;
        if (this.deathTime >= deathLength - 1) {
          this.deathTime = deathLength - 1;
        }
        break;
      }
    }
  }
  
  getBaseBlendDuration() {
    // Different blend speeds for different transitions
    if (this.currentBaseAnimation.includes('cr') !== this.targetBaseAnimation.includes('cr')) {
      return this.stanceBlendDuration; // Stance change
    }
    return this.movementBlendDuration; // Movement change
  }
  
  getCurrentAnimationData() {
    // Get current base animation data
    const currentBaseRange = ANIMS[this.currentBaseAnimation];
    const currentBaseLength = currentBaseRange.end - currentBaseRange.start + 1;
    const currentBaseLocal = this.baseAnimTime % currentBaseLength;
    const currentBaseFrame0 = currentBaseRange.start + Math.floor(currentBaseLocal);
    const currentBaseFrame1 = currentBaseRange.start + ((Math.floor(currentBaseLocal) + 1) % currentBaseLength);
    const currentBaseFrac = currentBaseLocal - Math.floor(currentBaseLocal);
    
    let primaryFrame0 = currentBaseFrame0;
    let primaryFrame1 = currentBaseFrame1;
    let primaryFrac = currentBaseFrac;
    
    let secondaryFrame0 = currentBaseFrame0;
    let secondaryFrame1 = currentBaseFrame1;
    let secondaryFrac = currentBaseFrac;
    let blendFactor = 0.0;
    
    // Handle different blend states
    if (this.blendState === 'blending_base') {
      const targetBaseRange = ANIMS[this.targetBaseAnimation];
      const targetBaseLength = targetBaseRange.end - targetBaseRange.start + 1;
      const targetBaseLocal = this.targetBaseAnimTime % targetBaseLength;
      secondaryFrame0 = targetBaseRange.start + Math.floor(targetBaseLocal);
      secondaryFrame1 = targetBaseRange.start + ((Math.floor(targetBaseLocal) + 1) % targetBaseLength);
      secondaryFrac = targetBaseLocal - Math.floor(targetBaseLocal);
      blendFactor = this.blendFactor;
      
    } else if (this.blendState === 'blending_to_oneshot' || this.blendState === 'oneshot' || this.blendState === 'blending_to_base') {
      if (this.currentOneShot) {
        const oneShotRange = ANIMS[this.currentOneShot];
        const oneShotLength = oneShotRange.end - oneShotRange.start + 1;
        const oneShotLocal = Math.min(this.oneShotTime, oneShotLength - 1);
        secondaryFrame0 = oneShotRange.start + Math.floor(oneShotLocal);
        secondaryFrame1 = oneShotRange.start + Math.min(Math.floor(oneShotLocal) + 1, oneShotLength - 1);
        secondaryFrac = oneShotLocal - Math.floor(oneShotLocal);
        blendFactor = this.blendFactor;
      }
      
    } else if (this.blendState === 'blending_to_jump' || this.blendState === 'jump' || this.blendState === 'blending_from_jump') {
      if (this.currentJump) {
        const jumpRange = ANIMS[this.currentJump];
        const jumpLength = jumpRange.end - jumpRange.start + 1;
        const jumpLocal = Math.min(this.jumpTime, jumpLength - 1);
        secondaryFrame0 = jumpRange.start + Math.floor(jumpLocal);
        secondaryFrame1 = jumpRange.start + Math.min(Math.floor(jumpLocal) + 1, jumpLength - 1);
        secondaryFrac = jumpLocal - Math.floor(jumpLocal);
        blendFactor = this.blendFactor;
      }
      
    } else if (this.blendState === 'blending_to_death' || this.blendState === 'death') {
      if (this.currentDeath) {
        const deathRange = ANIMS[this.currentDeath];
        const deathLength = deathRange.end - deathRange.start + 1;
        const deathLocal = Math.min(this.deathTime, deathLength - 1);
        secondaryFrame0 = deathRange.start + Math.floor(deathLocal);
        secondaryFrame1 = deathRange.start + Math.min(Math.floor(deathLocal) + 1, deathLength - 1);
        secondaryFrac = deathLocal - Math.floor(deathLocal);
        blendFactor = this.blendFactor;
      }
    }
    
    return {
      frame0A: primaryFrame0,
      frame1A: primaryFrame1,
      fracA: primaryFrac,
      frame0B: secondaryFrame0,
      frame1B: secondaryFrame1,
      fracB: secondaryFrac,
      blend: blendFactor,
      
      // State info
      state: this.blendState,
      stance: this.stance,
      isMoving: this.isMoving,
      isJumping: this.isJumping,
      isDead: this.isDead,
      currentBaseAnim: this.currentBaseAnimation,
      targetBaseAnim: this.targetBaseAnimation,
      oneShotAnim: this.currentOneShot,
      jumpAnim: this.currentJump,
      deathAnim: this.currentDeath
    };
  }
  
  // Utility methods
  getCurrentState() {
    return {
      state: this.blendState,
      stance: this.stance,
      isMoving: this.isMoving,
      isJumping: this.isJumping,
      isDead: this.isDead,
      blendFactor: this.blendFactor
    };
  }
  
  getValidOneShots() {
    return this.stance === 'standing' ? 
      this.standingAnimations.oneShots : 
      this.crouchingAnimations.oneShots;
  }
  
  getValidDeaths() {
    return this.stance === 'standing' ? 
      this.standingAnimations.deaths : 
      this.crouchingAnimations.deaths;
  }

  // Optional config
  setJumpExitTiming(fraction01) {
    this.jumpReturnAt = Math.max(0.0, Math.min(1.0, fraction01));
  }
}