import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AccountService } from './account.service';
import { Member } from '../_models/member';
import { of, tap } from 'rxjs';
import { Photo } from '../_models/photo';
import { PaginatedResult } from '../_models/pagination';
import { UserParams } from '../_models/userParams';

@Injectable({
  providedIn: 'root'
})
export class MembersService {
  private http = inject(HttpClient);
  private accountService = inject(AccountService);
  baseUrl = environment.apiUrl;
  paginatedResult = signal<PaginatedResult<Member[]> | null>(null);
  //caching for members
  memberCache = new Map();
  //remember filters
  user = this.accountService.currentUser();
  userPrams = signal<UserParams>(new UserParams(this.user));

  resetUserParams(){
    this.userPrams.set(new UserParams(this.user));
  }

  getMembers(){
    const response = this.memberCache.get(Object.values(this.userPrams()).join('-'));

    if(response) return this.setPaginatedResponse(response);

    let params = this.setPaginationHeaders(this.userPrams().pageNumber, this.userPrams().pageSize);

    params = params.append('minAge', this.userPrams().minAge);
    params = params.append('maxAge', this.userPrams().maxAge);
    params = params.append('gender', this.userPrams().gender);
    params = params.append('orderBy', this.userPrams().orderBy);

    return this.http.get<Member[]>(this.baseUrl +'users', {observe: 'response', params}).subscribe({
      next: response => {
        this.setPaginatedResponse(response);
        this.memberCache.set(Object.values(this.userPrams()).join('-'), response);
      }
    })
  }

  private setPaginatedResponse(response: HttpResponse<Member[]>){
    this.paginatedResult.set({
      items: response.body as Member[],
      pagination: JSON.parse(response.headers.get('Pagiantion')!)
    })
  }

  private setPaginationHeaders(pageNumber: number, pageSize: number){
    let params = new HttpParams();

    if(pageNumber && pageSize){
      params = params.append('pageNumber', pageNumber);
      params = params.append('pageSize', pageSize);
    }
    return params;
  }

  getMember(username: string){
    const member: Member = [...this.memberCache.values()]
      .reduce((arr, e) => arr.concat(e.body), [])
      .find((m: Member) => m.userName === username);

    if(member) return of(member);
    
    return this.http.get<Member>(this.baseUrl +'users/' +username);
  }

  upadteMember(member: Member){
    return this.http.put(this.baseUrl+ 'users', member).pipe(
      // tap(() => {
      //   this.members.update(members => members.map(m => m.userName === member.userName
      //     ? member : m
      //   ))
      // })
    )
  }
  setMainPhoto(photo: Photo){
    return this.http.put(this.baseUrl + 'users/set-main-photo/' +photo.id, {}).pipe(
      // tap(() => {
      //   this.members.update(members => members.map(m =>{
      //     if(m.photos.includes(photo)){
      //       m.photoUrl = photo.url
      //     }
      //     return m;
      //   }))
      // })
    )
  }

  deletePhoto(photo: Photo){
    return this.http.delete(this.baseUrl + 'users/delete-photo/' + photo.id).pipe(
      // tap(() => {
      //   this.members.update(members => members.map(m => {
      //     if(m.photos.includes(photo)){
      //       m.photos = m.photos.filter(x => x.id !== photo.id)
      //     }
      //     return m;
      //   }))
      // })
    )
  }
}
