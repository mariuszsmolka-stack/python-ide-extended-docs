import {renderPlot} from './engine/plot.js';
import {previewData} from './preview-data.js';
const host=document.getElementById('plot'),status=document.getElementById('plot-status');
try{
 const name=host.dataset.preview;
 renderPlot(await previewData(name,'plot',128*1024));host.dataset.state='ready';
}catch(error){host.dataset.state='error';status.textContent=error.message;}
