// Run with a Playwright browser installed, or CHROMIUM_EXECUTABLE=/path/to/chromium.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.SUBROGADA_QA_DIR || '/tmp/censo-subrogada-qa';
await mkdir(output, { recursive: true });
const fixture = `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body class="base-dark" style="--accent:#4da4f6;--accent-soft:rgba(77,164,246,.12);--accent-border:rgba(77,164,246,.4)"><div id="mainAppContainer"><span id="meta-text"></span><div id="content"></div><button id="mainFabBtn"></button></div><script type="module">
import * as bed from '/modules/bedModule.js';import * as utils from '/modules/utilsModule.js';
import {createRenderModule} from '/modules/renderModule.js';import {createModalModule} from '/modules/modalModule.js';import {createInteractionModule} from '/modules/interactionModule.js';import {createSubrogadaModule} from '/modules/subrogadaModule.js';
const pacientesGlobal=[{fila:'p1',nombre:'JUAN PÉREZ GARCÍA',edad:'56',diagnostico:'Dolor abdominal en estudio',cama:'CAMA 4',area:'OBSERVACIÓN'},{fila:'p2',nombre:'PACIENTE PEDIÁTRICO',edad:'8 MESES',diagnostico:'Diagnóstico de prueba',cama:'CAMA 1',area:'PEDIATRÍA'}];
const app=window.app={bed,utils,firebase:{},state:{pacientesGlobal,currentViewMode:'table',selectedNavIndex:-1},initScrollGuider(){},initSwipe(){}};
Object.assign(app,createInteractionModule(app),createRenderModule(app),createModalModule(app),createSubrogadaModule(app));app.bindModalBaseEvents();app.exposeWindowActions();app.initSubrogadaUi();app.render(pacientesGlobal);
window.openEditCount=0;app.abrirModal=()=>{window.openEditCount++};window.toggleTableRow=()=>{};
const originalOpen=window.open.bind(window);window.open=(...args)=>{if(window.blockPopup)return null;const w=originalOpen(...args);if(w){w.printCount=0;w.print=()=>{w.printCount++}}return w};
</script></body></html>`;
const server = createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return}const target=resolve(root,'.'+decodeURIComponent(pathname));if(!target.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(target)]||'application/octet-stream');res.end(await readFile(target))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
try {
 const page=await browser.newPage({viewport:{width:1365,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('[data-censo-action="subrogar"]').first().waitFor();
 await page.click('[data-censo-action="subrogar"][data-fila="p1"]');const modal=page.locator('#subrogadaModal');await modal.waitFor({state:'visible'});
 assert.equal(await modal.locator('[name=patient]').inputValue(),'JUAN PÉREZ GARCÍA');
 await modal.locator('[name=diagnosis]').fill('Dolor abdominal en estudio\nPendiente de imagen');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>window.openEditCount),0);
 await modal.locator('[name=type]').selectOption('Tomografía');await modal.locator('[name=service]').selectOption('Tomografía de abdomen con contraste');await modal.locator('[name=doctor]').selectOption('Dr. Rodrigo Ulises Rodriguez Garcia');
 await page.screenshot({path:output+'/modal-desktop.png'});
 let popupPromise=page.waitForEvent('popup');await modal.locator('[type=submit]').click();const first=await popupPromise;await first.waitForFunction(()=>window.printCount===1);assert.equal(await modal.isVisible(),true);
 await first.pdf({path:output+'/solicitud.pdf',preferCSSPageSize:true,printBackground:true});assert.equal(await first.locator('img').count(),2);
 await modal.locator('[name=type]').selectOption('Ambulancia');await modal.locator('[name=service]').selectOption('Ambulancia de traslado con médico');await modal.locator('[name=details]').fill('Unidad receptora de prueba');
 popupPromise=page.waitForEvent('popup');await modal.locator('[type=submit]').click();const second=await popupPromise;await second.waitForFunction(()=>window.printCount===1);
 assert.equal(await modal.isVisible(),true);assert.ok((await first.locator('body').innerText()).includes('Tomografía de abdomen'));assert.ok(!(await first.locator('body').innerText()).includes('Unidad receptora'));assert.ok((await second.locator('body').innerText()).includes('Ambulancia de traslado con médico'));
 assert.equal(await page.evaluate(()=>app.state.pacientesGlobal[0].diagnostico),'Dolor abdominal en estudio');
 await page.evaluate(()=>window.blockPopup=true);await modal.locator('[type=submit]').click();assert.ok((await modal.locator('[role=status]').innerText()).includes('bloqueó'));assert.equal(await modal.locator('[name=details]').inputValue(),'Unidad receptora de prueba');await page.evaluate(()=>window.blockPopup=false);
 await modal.locator('[name=type]').selectOption('Otro');await modal.locator('[name=otherService]').fill('Servicio <especial>');assert.equal(await modal.locator('[name=service]').isVisible(),false);
 await page.keyboard.press('Escape');await page.click('[data-censo-action="subrogar"][data-fila="p2"]');assert.equal(await modal.locator('[name=age]').inputValue(),'8');assert.equal(await modal.locator('[name=unit]').inputValue(),'meses');assert.equal(await modal.locator('[name=type]').inputValue(),'');assert.equal(await modal.locator('[name=details]').inputValue(),'');assert.equal(await modal.locator('[name=doctor]').inputValue(),'Dr. Rodrigo Ulises Rodriguez Garcia');
 await modal.locator('[name=type]').selectOption('Resonancia magnética');await modal.locator('[name=service]').selectOption('Otro');await modal.locator('[name=otherService]').fill('Resonancia de prueba');await modal.locator('[name=doctor]').selectOption('Otro');await modal.locator('[name=otherDoctor]').fill('Dra. Prueba');
 await page.setViewportSize({width:375,height:812});await page.screenshot({path:output+'/modal-mobile.png'});assert.ok(await modal.evaluate(d=>d.scrollWidth<=d.clientWidth+1));
 await modal.locator('[name=reason]').fill('Justificación extensa. '.repeat(100));popupPromise=page.waitForEvent('popup');await modal.locator('[type=submit]').click();const long=await popupPromise;await long.waitForFunction(()=>window.printCount===1);await long.pdf({path:output+'/solicitud-larga.pdf',preferCSSPageSize:true});
 await page.keyboard.press('Escape');await page.evaluate(()=>app.render(app.state.pacientesGlobal));assert.equal(await page.locator('.card [data-censo-action="subrogar"]').count(),2);
 await page.locator('.card .card-header').first().click();await page.locator('.card [data-censo-action="subrogar"]').first().click();assert.equal(await modal.isVisible(),true);
 assert.deepEqual(errors,[]);console.log('OK: acciones tabla/tarjetas, modal móvil, teclado, dos impresiones, ventana bloqueada, médico, edades y aislamiento entre pacientes.');
} finally {await browser.close();await new Promise(r=>server.close(r));}
