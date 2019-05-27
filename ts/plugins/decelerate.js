import { Plugin } from './plugin'

export class Decelerate extends Plugin
{
    /**
     * @private
     * @param {Viewport} parent
     * @param {object} [options]
     * @param {number} [options.friction=0.95] percent to decelerate after movement
     * @param {number} [options.bounce=0.8] percent to decelerate when past boundaries (only applicable when viewport.bounce() is active)
     * @param {number} [options.minSpeed=0.01] minimum velocity before stopping/reversing acceleration
     */
    constructor(parent, options)
    {
        super(parent)
        options = options || {}
        this.friction = options.friction || 0.95
        this.bounce = options.bounce || 0.5
        this.minSpeed = typeof options.minSpeed !== 'undefined' ? options.minSpeed : 0.01
        this.saved = []
        this.reset()
        this.parent.on('moved', data => this.moved(data))
    }

    down()
    {
        this.saved = []
        this.x = this.y = false
    }

    isActive()
    {
        return this.x || this.y
    }

    move()
    {
        if (this.paused)
        {
            return
        }

        const count = this.parent.countDownPointers()
        if (count === 1 || (count > 1 && !this.parent.plugins['pinch']))
        {
            this.saved.push({ x: this.parent.x, y: this.parent.y, time: performance.now() })
            if (this.saved.length > 60)
            {
                this.saved.splice(0, 30)
            }
        }
    }

    moved(data)
    {
        if (this.saved.length)
        {
            const last = this.saved[this.saved.length - 1]
            if (data.type === 'clamp-x')
            {
                if (last.x === data.original.x)
                {
                    last.x = this.parent.x
                }
            }
            else if (data.type === 'clamp-y')
            {
                if (last.y === data.original.y)
                {
                    last.y = this.parent.y
                }
            }
        }
    }

    up()
    {
        if (this.parent.countDownPointers() === 0 && this.saved.length)
        {
            const now = performance.now()
            for (let save of this.saved)
            {
                if (save.time >= now - 100)
                {
                    const time = now - save.time
                    this.x = (this.parent.x - save.x) / time
                    this.y = (this.parent.y - save.y) / time
                    this.percentChangeX = this.percentChangeY = this.friction
                    break
                }
            }
        }
    }

    /**
     * manually activate plugin
     * @param {object} options
     * @param {number} [options.x]
     * @param {number} [options.y]
     */
    activate(options)
    {
        options = options || {}
        if (typeof options.x !== 'undefined')
        {
            this.x = options.x
            this.percentChangeX = this.friction
        }
        if (typeof options.y !== 'undefined')
        {
            this.y = options.y
            this.percentChangeY = this.friction
        }
    }

    update(elapsed)
    {
        if (this.paused)
        {
            return
        }

        let moved
        if (this.x)
        {
            this.parent.x += this.x * elapsed
            this.x *= this.percentChangeX
            if (Math.abs(this.x) < this.minSpeed)
            {
                this.x = 0
            }
            moved = true
        }
        if (this.y)
        {
            this.parent.y += this.y * elapsed
            this.y *= this.percentChangeY
            if (Math.abs(this.y) < this.minSpeed)
            {
                this.y = 0
            }
            moved = true
        }
        if (moved)
        {
            this.parent.emit('moved', { viewport: this.parent, type: 'decelerate' })
        }
    }

    reset()
    {
        this.x = this.y = null
    }
}