import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homepageSchema} from '../server/validation.mjs';
import {recordEvent} from '../server/analytics.mjs';
const base={hero_title:'Bunty Sajji',hero_subtitle:'Food for your table',hero_image:'/assets/food/sajji.webp',button_label:'Explore menu',show_deals:true,show_story:true,show_featured:true,featured_count:6};
test('existing homepage settings remain compatible and new public claims require details',()=>{
 assert.equal(homepageSchema.parse(base).dining_enabled,false);
 assert.equal(homepageSchema.safeParse({...base,dining_enabled:true}).success,false);
 assert.equal(homepageSchema.safeParse({...base,dining_enabled:true,dining_description:'Confirmed facilities'}).success,true);
 assert.equal(homepageSchema.safeParse({...base,review_enabled:true,review_quote:'Review'}).success,false);
 assert.equal(homepageSchema.safeParse({...base,review_enabled:true,review_quote:'Review',review_author:'Customer',review_url:'javascript:alert(1)'}).success,false);
 assert.equal(homepageSchema.safeParse({...base,review_enabled:true,review_quote:'Review',review_author:'Customer',review_url:'https://example.com/review'}).success,true);
});
test('analytics rejects customer data and accepts only enumerated conversion events',()=>{
 const logs=[];assert.equal(recordEvent({event:'add_to_cart'},v=>logs.push(JSON.parse(v))),true);
 assert.equal(recordEvent({event:'checkout_started',phone:'03001234567'},v=>logs.push(v)),false);
 assert.equal(recordEvent({event:'arbitrary'},v=>logs.push(v)),false);
 assert.equal(logs.length,1);assert.deepEqual(Object.keys(logs[0]),['type','event','at']);
});
