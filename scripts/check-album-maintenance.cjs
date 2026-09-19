const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let deletes=0,updates=0;
const mocks={
 './kv-db':{registerKvMigration(){}},
 './photo-album-storage':{collectPhotoAlbumAssets:()=>[{favorite:true,source:{kind:'chat',messageId:'fav'}}]},
 './media-cache-storage':{isMediaStoreRef:()=>true,loadMediaBlob:async()=>({blob:new Blob(['x'])}),deleteMediaRef:async()=>deletes++},
 './chat-storage':{updateChatMessage:()=>{updates++;return null}},
 './chat-db':{chatDb:{messages:{put:async()=>{}}}},
 './data-management/serializers':{estimateValueBytes:()=>1},
};
const box={exports:{},require:k=>mocks[k]||{},Date,Set,Blob};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/media-maintenance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
(async()=>{
 assert.equal(await box.exports.cleanChatImage({id:'fav',mediaUrl:'media-store://fav'},new Date().toISOString()),0);
 assert.equal(deletes,0);assert.equal(updates,0);
 await box.exports.cleanChatImage({id:'not-fav',mediaUrl:'media-store://other'},new Date().toISOString());
 assert.equal(deletes,1);assert.equal(updates,1);
 console.log('PASS: automatic cleanup protects album favorites while normal cleanup still works');
})().catch(e=>{console.error(e);process.exitCode=1});
