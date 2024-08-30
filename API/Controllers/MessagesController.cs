using System;
using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Helpers;
using API.Interfaces;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
public class MessagesController(IMessageRepository messageRepository, IUserRepository userRepository, 
    IMapper mapper) : BaseApiController
{
    [HttpPost]
    public async Task<ActionResult<MessageDto>> CreateMessage(CreateMessageDto createMessageDto)
    {
        var username = User.GetUsername();
        if(username == createMessageDto.RecipientUsername.ToLower())
            return BadRequest("You cannot mesgae urself");
        
        var sender = await userRepository.GetUserByNameAsync(username);
        var recipient = await userRepository.GetUserByNameAsync(createMessageDto.RecipientUsername);

        if(recipient ==null || sender == null) return BadRequest("Cannot send message at this time");

        var message = new Message
        {
            Sender = sender,
            Recipient = recipient,
            SenderUserName = sender.UserName,
            RecipientUserName = recipient.UserName,
            Content = createMessageDto.Content
        };

        messageRepository.AddMessage(message);
         
        if(await messageRepository.SaveAllAsync()) return Ok(mapper.Map<MessageDto>(message));
        return BadRequest("Error save message");
    }


    [HttpGet]
    public async Task<ActionResult<IEnumerable<MessageDto>>> GetMessagesForUser([FromQuery]MessageParams messageParams)
    {
        messageParams.UserName = User.GetUsername();
        var messages = await messageRepository.GetMessagesForUser(messageParams);
        Response.AddPaginationHeader(messages);

        return messages;
    }

    [HttpGet("thread/{username}")]
    public async Task<ActionResult<IEnumerable<MessageDto>>> GetMessageThread(string username)
    {
        var currentUsername = User.GetUsername();

        return Ok(await messageRepository.GetMessageThread(currentUsername, username));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteMessage(int id)
    {
        var username = User.GetUsername();
        var message = await messageRepository.GetMessage(id);

        if(message == null) return BadRequest("Cannot delete this message");

        if(message.SenderUserName != username && message.RecipientUserName != username)
            return Forbid();

        if(message.SenderUserName ==username) message.SenderDeleted =true;
        if(message.RecipientUserName ==username) message.RecipientDeleted =true;
        

        //.net8
        //if(message.SenderDeleted ==true && message.RecipientDeleted ==true){}
        if(message is {SenderDeleted: true, RecipientDeleted: true})
        {
            messageRepository.DeleteMessage(message);
        }

        if(await messageRepository.SaveAllAsync()) return Ok();

        return BadRequest("Problem deleting the message");
        
    }

}
