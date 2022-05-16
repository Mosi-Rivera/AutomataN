const debounce = (func, delay) => {

    let inDebounce
    
    return function() {
    
    const context = this
    
    const args = arguments
    
    clearTimeout(inDebounce)
    
    inDebounce = setTimeout(() => func.apply(context, args), delay)
    
    }
    
}

function generateGrid(size)
{
    let result = [];
    let width = size;
    size = size * size;
    for (let i = 0, l = size; i < l; i++)
        result.push(new ConwaysPixel(false,i,width));
    for (let i = size; i--;)
        result[i].prepare(result);
    return result;
}

class ConwaysPixel
{
    constructor(alive,index,width)
    {
        this.width = width;
        this.index = index;
        this.x = this.index % width;
        this.y = Math.floor(this.index / width);
        this.alive = alive;
        this.last_state = null;
        this.next_state = null;
        this.neighbors = [];
        this.alive_neighbors = [];
    }
    prepare(grid)
    {
        let width = this.width;
        let x = this.x;
        let y = this.y;
        for (let _x = Math.max(x - 1,0), _lx = Math.min(x + 1,width - 1);  _x <= _lx; _x++)
        {
            for (let _y = Math.max(y - 1,0), _ly = Math.min(y + 1,width - 1); _y <= _ly; _y++)
            {
                if (_x == x && _y == y)
                    continue;
                this.neighbors.push(grid[_y * width + _x]);
            }
        }
    }
    preupdate(underpopulation,overpopulation,reproduction)
    {
        let sum = 0;
        let next_state = this.alive;
        let alive_neighbors = [];

        let neighbors = this.neighbors;
        for (let i = neighbors.length; i--;)
        {
            if (neighbors[i].alive)
            {
                alive_neighbors.push(neighbors[i]);
                sum++;
            }
        }

        if (next_state && (sum < underpopulation || sum > overpopulation))
            next_state = false;
        else if (!next_state && sum === reproduction)
            next_state = true;

        this.next_state = next_state;
        this.alive_neighbors = alive_neighbors;
    }
    update()
    {
        this.last_state = this.alive;
        this.alive = this.next_state;
        this.next_state = null;
        return this.last_state != this.alive;
    }
    onclick()
    {
        this.alive = !this.alive;
    }
    reset()
    {
        this.alive = false;
        this.last_state = null;
        this.next_state = false;
        this.alive_neighbors = [];
    }
}
class ConwaysGame
{
    underpopulation = 2;
    overpopulation = 4;
    reproduction = 3;
    grid_size;
    constructor(grid_size)
    {
        this.setGridSize(grid_size);
    }
    setUnderpopulation(n)
    {
        this.underpopulation = n;
    }
    setOverpopulation(n)
    {
        this.overpopulation = n;
    }
    setReproduction(n)
    {
        this.reproduction = n;
    }
    setGridSize(n)
    {
        this.grid_size = n;
        this.data = generateGrid(this.grid_size);
    }
    onclick(x,y)
    {
        this.data[y * this.grid_size + x].onclick();
    }
    next()
    {
        this.update();
    }
    update()
    {
        let change_count = 0;
        let {underpopulation,overpopulation,reproduction,data} = this;
        for (let i = data.length; i--;)
            data[i].preupdate(underpopulation,overpopulation,reproduction);
        for (let i = data.length; i--;)
            if (data[i].update()) change_count++;
        return change_count > 0;
    }
    clear()
    {
        let data = this.data;
        for (let i = data.length; i--;)
            data[i].reset();
    }
    tile_clear()
    {

    }
    tileDraw(ctx,tile_size)
    {
        let data = this.data;
        ctx.fillStyle = 'white';
        for (let i = data.length; i--;)
        {
            let {x,y,alive} = data[i];
            if (alive)
            {
                ctx.fillRect(
                    x * tile_size + 1,
                    y * tile_size + 1,
                    tile_size - 2,
                    tile_size - 2
                );
            }
        }
    }
    lineDraw(ctx,tile_size,horizontal_color,vertical_color,diagonal_color)
    {
        let tile_size_d2 = tile_size / 2;
        let data = this.data;
        ctx.fillStyle = 'white';
        for (let i = data.length; i--;)
        {
            let {x,y,alive_neighbors,alive} = data[i];
            if (alive)
            {
                for (let j = alive_neighbors.length; j--;)
                {
                    let {x: nx,y: ny} = alive_neighbors[j];
                    let dx = x - nx;
                    let dy = y - ny;
                    if (nx < x || (ny < y && dx == 0)) 
                        continue;
                    if (dx == 0)
                        ctx.strokeStyle = vertical_color;
                    else if (dy == 0)
                        ctx.strokeStyle = horizontal_color;
                    else
                        ctx.strokeStyle = diagonal_color;

                    ctx.beginPath();
                    ctx.moveTo(
                        x * tile_size + tile_size_d2 + dx * -1,
                        y * tile_size + tile_size_d2 + dy * -1
                    );
                    ctx.lineTo(
                        nx * tile_size + tile_size_d2 + dx * 1,
                        ny * tile_size + tile_size_d2 + dy * 1
                    );
                    ctx.stroke();
                }
            }
        }
    }
}

class ClientFacing
{
    draw_method = 'line';
    fps = 10;
    raf_index;
    last_tick = 0;
    ctx;
    canvas;
    size = 50;
    data;
    tile_size;
    line_width = 8;
    colors = [
        '#ffffff',
        '#ffffff',
        '#ffffff'
    ]
    playing = false;
    background_color = '#000000';
    constructor()
    {
        this.fps_dt = 1  /this.fps;
        this.canvas     = document.createElement('canvas');
        this.ctx        = this.canvas.getContext('2d');
        this.data       = new ConwaysGame(this.size);
        this.update     = this.update.bind(this);
        document.getElementById('canvas-container').appendChild(this.canvas);
        window.addEventListener('keydown',this.keydown.bind(this));
        window.addEventListener('keyup',this.keyup.bind(this));
        this.canvas.addEventListener('mousedown',this.onclick.bind(this));
        window.addEventListener('resize',debounce(this.resize.bind(this)));
        let colors = document.getElementsByClassName('directional-color-input');
        for (let i = colors.length; i--;)
            colors[i].oninput = this.onColorChange.bind(this,i);
        document.getElementById('background-color-input').oninput = this.onBackgroundColorChange.bind(this);
        document.getElementById('reset-colors').onclick = this.resetColors.bind(this);
        this.resize();
    }
    setDrawMethod(method)
    {
        this.draw_method = method;
        this.draw();
    }
    resetColors()
    {
        this.colors = [
            '#ffffff',
            '#ffffff',
            '#ffffff'
        ];
        this.background_color = '#000000';
        this.setBackgroundColor('#000000');
        this.draw();
    }
    setBackgroundColor(color)
    {
        this.canvas.style.backgroundColor = color;
    }
    setColor(color,i)
    {
        this.colors[i] = color;
        this.draw();
    }
    onBackgroundColorChange(e)
    {
        this.setBackgroundColor(e.target.value);
    }
    onColorChange(i,e)
    {
        this.setColor(e.target.value,i);
    }
    setLineWidth(w)
    {
        this.line_width = w;
        this.ctx.lineWidth = this.tile_size * (w / 10);
    }
    resize()
    {
        let sx = window.innerWidth / window.innerHeight,
            sy = window.innerHeight / window.innerWidth;
        let scale = Math.min(sx,sy);
        this.canvas.width = this.canvas.height = window.innerWidth * scale;
        let tile_size = this.canvas.width / this.size;
        this.tile_size = tile_size;
        this.setLineWidth(this.line_width);
        this.ctx.imageSmoothingEnabled = false;
        this.clearRect();
        this.data.tileDraw(this.ctx,this.tile_size);
    }
    onclick(e)
    {
        let {offsetX,offsetY} = e;
        this.data.onclick(
            Math.floor(offsetX / this.tile_size),
            Math.floor(offsetY / this.tile_size)
        );
        this.clearRect();
        this.data.tileDraw(this.ctx,this.tile_size);
    }
    keydown(e)
    {
        if (e.code == 'Space')
        {
            this[this.playing ? 'stop' : 'start']();
            this.space_down = true;
        }
    }
    keyup(e)
    {
        if (e.code == 'Space')
            this.space_down = false;
    }
    clearGrid()
    {
        this.data.clear();
    }
    clearRect()
    {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    draw()
    {
        this.clearRect();
        this.data[this.draw_method +  'Draw'](this.ctx,this.tile_size,...this.colors);
    }
    update()
    {
        let now = Date.now();
        let dt = (now - this.last_tick) / 1000;
        if (dt >= this.fps_dt)
        {
            this.last_tick = now;
            if (!this.data.update())
                this.stop();
            this.draw();
        }
        if (this.raf_index)
            requestAnimationFrame(this.update);
    }
    start()
    {
        console.log('starting');
        this.last_tick = Date.now();
        this.raf_index = requestAnimationFrame(this.update);
        this.playing = true;
    }
    stop()
    {
        console.log('stopping');
        cancelAnimationFrame(this.raf_index);
        this.raf_index = null;
        this.playing = false;
    }
}

const game = new ClientFacing();